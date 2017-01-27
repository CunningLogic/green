var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var _ = require('lodash');

var gulp = require('gulp');
var through = require('through2');
var gulpThrough = require('through-gulp');
var plumber = require('gulp-plumber');

var revAll = require('gulp-rev-all');
var revCollector = require('gulp-rev-collector');
var urlModify = require('gulp-modify-css-urls');
var csso = require('gulp-csso');
var uglify = require('gulp-uglify');

var awspublish = require('gulp-awspublish');
var rename = require("gulp-rename");
var parallelize = require("concurrent-transform");
var useref = require('gulp-useref');

var qiniuPublish = require('node-qiniu');
var qn = require('qn');

var async = require('async');
var crypto = require('crypto');
//=====linux file copy
var scp = require('gulp-scp2');
var chalk = require('chalk');

var base = process.cwd(),
    html = "",
    from_cache = false,
    manifest = null;

module.exports = function (req) {
  //====private function
  var Util = {
    //=======assets md5
    md5: function (html, callback, all_manifest, env) {
      var empty = {match: [], styles: [], manifest: {}, page_ref: []};
      var reg = /\/(styles|images|scripts|fonts)\/.*?("|'|\))/g;
      var matchs = html.match(reg) || [];
      var styles = matchs.filter(function (item) {
        return /^\/(styles|scripts)/.test(item);
      });
      styles = styles.map(function (item) {
        return ".tmp/public" + item.replace(/"|'|\)/g, '');
      });

      var page_ref = matchs.map(function (item) {
        return item.replace(/"|'|\)/g, '');
      }); //页面中引入的资源

      var cn_manifest = {};//cdn资源路径

      var rev = new revAll({
        hashLength: 32,
        transformFilename: function (file, raw_hash) {
          var content = file.contents.toString();

          //===== 将cdn host，作为影响 css md5 的一个变量
          if(/\.css$/.test(file.path)){
            var cdn_host = settings.cdn[env];
            var is_production = env === 'production',
                css_cdn = is_production ? '//www-optimized.djicdn.com' : cdn_host.host(file.path);
            content += css_cdn; //add cdn host
          }

          var hash = crypto.createHash('md5')
            .update(content, 'utf8').digest('hex');
          //console.log(file.path);
          //console.log(hash);
          //console.log(raw_hash);
          //console.log('----------');

          var ext = path.extname(file.path),
              name = file.path.substring(file.path.lastIndexOf('/') + 1, file.path.lastIndexOf('.')),
              dir = path.dirname(file.path).replace(/.*\.tmp\/public\//, ''),
              key = dir + '/' + name + ext,
              file_key = dir + '/' + name + "-" + hash + ext;

          //if(!/^(styles|images|scripts|fonts)/.test(name)){
          //  name = dir + name;
          //}//如果不以资源路径开头
          if (all_manifest && all_manifest[key]) {
            return path.basename(all_manifest[key]);
          } else {
            cn_manifest[key] = file_key;
            return name + "-" + hash + ext; //filename-hash.ext
          }
        }
      });

      gulp.src(styles)
        .pipe(through.obj(function (file, enc, cb) {
          var content = file.contents.toString(),
              style_match = content.match(reg) || [];
          if (style_match) {
            matchs = matchs.concat(style_match);
          }
          return cb();
        }))
        .on('error', function (err) {
          callback(err, empty);
        })
        .on('finish', function () {
          matchs = matchs.map(function (item) {
            return ".tmp/public" + item.replace(/"|'|\)/g, '').replace(/(\?|#).*$/g, '');
          });
          if (from_cache) {
            var manifest_str = JSON.stringify(manifest);
            //=======如果配置来自于缓存，直接写入文件，供后续流程调用
            fs.writeFile(base + '/build/assets/rev-manifest.json', manifest_str, 'utf-8', function (err) {
              callback(err, {match: matchs, styles: styles, manifest: manifest});
            });
          }

          var filter = {},//过滤重复选项
              not_exsist = [],
              mobile_match = [];

          matchs.forEach(function (item) {
            var match = item.match(/(styles|images|scripts)/g);
            var mobile_path = item.replace(match, RegExp.$1 + "/mobile");

            if (fs.existsSync(base + "/" + mobile_path)) {
              mobile_match.push(mobile_path);
            }
          });

          //===== 过滤不存在的资源
          matchs = matchs.concat(mobile_match).filter(function (item) {
            var exsist = filter[item],
              file_exsist = !exsist && fs.existsSync(item);
            if (!exsist) filter[item] = true;
            if (!file_exsist) not_exsist.push(item);

            return item && file_exsist;
          });


          if (matchs.length == 0) {
            var error = not_exsist.length > 0 ? {
              type: 'warn',
              msg: 'warning: no assets found in this file, checkout .tmp/ has assets exisits or remove this jade?',
              not_exsist: not_exsist
            } : null;
            return callback(error, empty);
          }

          return gulp.src(matchs, {base: '.tmp/public'})
            .pipe(rev.revision())
            .pipe(gulp.dest('build/assets'))
            .pipe(rev.manifestFile())
            .pipe(gulp.dest('build/assets'))
            .on('error', function (err) {
              callback(err, empty);
            })
            .on('finish', function () {
              fs.readFile(base + '/build/assets/rev-manifest.json', 'utf-8', function (err, content) {
                if (err) return callback(err, {});

                try {
                  if (content) {
                    manifest = _.merge(cn_manifest, JSON.parse(content));
                  }
                } catch (e) {
                  Monitor.error(e);
                  return callback(e, empty);
                }

                callback(null, {match: matchs, styles: styles, manifest: manifest, page_ref: page_ref});
              });
            });
        });
    },
    //=======replace url from html and css
    rev: function (source, styles, env, callback) {
      var locale = 'en', //default en
          dest = path.dirname(source[0]),
          output = {};
      var minifyCss = require('gulp-minify-css');
      var cdn_host = settings.cdn[env];

      console.log('save to-------->' + source[0]);

      //===== 以json为索引，替换 html 中的相应链接
      return gulp.src(['build/assets/rev-manifest.json'].concat(source))
        .pipe(revCollector({
          revSuffix: '-[0-9a-f]{8,64}-?',
          replaceReved: true,
          dirReplacements: {
            '/': function (src) {
              if (!output[src]) {
                output[src] = true;
                //console.log('src------>'+src);
              }

              if (/^(http:|https:)?\/\//.test(src)) return src;
              return cdn_host.host(src) + '/assets/' + src;
            }
          }
        }))
        .pipe(gulp.dest(dest))
        .on('finish', function () {
          //===match scripts tag
          var scripts = styles.filter(function (item) {
            return /public\/scripts\/.*js/.test(item);
          }).map(function (item) {
            var key = item.replace('.tmp/public/', '');
            return 'build/assets/' + manifest[key];
          });
          //===match styles tag
          styles = styles.filter(function (item) {
            return item.indexOf('public/styles/') > -1;
          }).map(function (item) {
            var key = item.replace('.tmp/public/', '');
            return 'build/assets/' + manifest[key];
          });

          if (styles.length == 0) {
            return callback(null, {});
          }

          console.log('-----rev css----');
          console.log(styles);

          gulp.src(styles, {base: 'build/assets'})
            .pipe(plumber()) //stop pipe breaking
            .pipe(urlModify({
              modify: function (url, filePath) {
                if (!output[url]) {
                  //console.log('url--->'+filePath);
                  output[url] = true;
                }
                if (/^(http:|https:)?\/\//.test(url)) return url;
                if (/^data:/.test(url)) return url; //data:image|text base64

                //如果路径中包含 关键字，则认为是cn资源，使用qbox host
                url = url.replace(/(\..\/)*/g, '');
                var url_key = url.replace(/^\//, ''),
                  ext = '';
                if (filePath.has('-cn-')) {
                  locale = 'zh-CN';
                  url_key = url_key.replace(/((\?|#).*)/, '');
                  ext = RegExp.$1 || '';
                }

                url = manifest[url_key] ? (manifest[url_key] + ext) : url;
                if (url[0] == '/') url = url.substring(1);

                var is_production = env === 'production',
                    cdn = is_production ? '//www-optimized.djicdn.com' : cdn_host.host(url);

                return cdn + "/assets/" + url;
              },
              silent: true
            }))
            .pipe(csso())//minifyCss())
            .pipe(gulp.dest('build/assets'))
            .on('error', function (err) {
              Monitor.error(err);
              callback(err);
            })
            .on('finish', function (err) {
              gulp.src(scripts, {base: 'build/assets'})
                .pipe(uglify())
                .pipe(gulp.dest('build/assets'))
                .on('finish', function (err1) {
                  callback(err1, manifest);
                });
            });
        });
    },
    //=======publish assets to aws cdn
    publish_cdn: function (env, callback, _manifest) {
      var publisher = awspublish.create({
        params: {
          region: "us-west-1",
          accessKeyId: settings['cdn_keys'].accessKeyId,
          secretAccessKey: settings['cdn_keys'].secretAccessKey,
          "Bucket": env == 'production' ? 'dji-www' : 'dbeta-me',
        }
      });
      console.log('-----md5 env ---->' + env);
      console.log('-----md5 bucket---->' + (env == 'production' ? 'all-dji-com' : 'dbeta-me'));

      // define custom headers
      var headers = {
        'Cache-Control': 'max-age=315360000, no-transform, public'
      };
      if (_manifest) manifest = _manifest;

      var cdn_files = []; //需要上传的文件
      for (var k in manifest) {
        if (manifest.hasOwnProperty(k))
          cdn_files.push("build/assets/" + manifest[k]);
      }

      return gulp.src(cdn_files, {
        base: 'build/'
      })
        // gzip, Set Content-Encoding headers and add .gz extension
        //.pipe(awspublish.gzip())
        //.pipe(awspublish.gzip({ ext: '.gz' }))w

        .pipe(rename(function (path) {
          return path;
        }))
        // publisher will add Content-Length, Content-Type and headers specified above
        // If not specified it will set x-amz-acl to public-read by default
        //开启多文件并行发布
        .pipe(parallelize(publisher.publish(headers), 100))
        // create a cache file to speed up consecutive uploads
        .pipe(publisher.cache())
        // ---------------
        // 删除旧的,发布新的,（使用，请注意下面的警告）
        // {warning},sync will delete files in your bucket that are not in your local folder.
        //.pipe(publisher.sync())
        // ----------------
        // print upload updates to console
        .pipe(awspublish.reporter({
          states: ['create', 'update', 'delete']
        }))
        .on('finish', function (err) {
          console.log('publish cdn finish...');
          callback(err);
        });
    },

    /**
     * 上传 七牛 存储空间
     *
     * config {
     *   needCache: false,
     *   AK: 'accessKey',
     *   SK: 'secretKey',
     *   bucket: 'bucket',
     *   basePath: 'root'
     * }
     * */
    publish_qbox: function (manifest, config, done) {
      //manifest = {
      //  key: "assets/styles/vender/swiper-848ea9d3f221678f84e380146969b605.css",
      //  key: "assets/styles/ams/apps-02dc3071597d686b15d8017df15d1bac.css",
      //  key: "assets/styles/ams/cache-9f8f1a5279ee09f446432263b53e444e.css":
      //};

      if(!config) {
        return Monitor.error('{ bucket, AK, SK } , must in config.');
      }

      config = Object.assign({
        needCache: false,
        AK: 'accessKey',
        SK: 'secretKey',
        bucket: 'bucket',
        basePath: settings.base_path + '/build/',
        folder: 'assets/'
      }, config);

      console.log(config);

      //===== 加载资源缓存列表
      var bucket = config.bucket,
          file_path = settings.base_path + '/.qnpublish-' + bucket,
          cache = {},
          cdn_tasks = [],
          errors = {length: 0};
      if(config.needCache && fs.existsSync(file_path)) {
        cache = JSON.parse(fs.readFileSync(file_path, 'utf-8') || "{}");
      }

      var client = qn.create({
        accessKey: config.AK,
        secretKey: config.SK,
        bucket: config.bucket,
        //origin: 'http://{bucket}.u.qiniudn.com',
        // timeout: 3600000, // default rpc timeout: one hour, optional
        // if your app outside of China, please set `uploadURL` to `http://up.qiniug.com/`
        uploadURL: 'http://up.qiniu.com/'
      });

      //===== 上传资源到 cdn
      Object.keys(manifest).forEach(function (k) {
        var md5_path = config.folder + manifest[k];
        if(cache[md5_path]) {
          return false; //skip 不重复上传
        }

        cdn_tasks.push(function (cb) {
          var file_path = config.basePath + md5_path;

          client.uploadFile(file_path, {key: md5_path}, function (err, result) {
              if(err) {
                errors[md5_path] = false;
                errors.length += 1;
                Monitor.error('上传文件失败：' + md5_path);
                console.error(err.ResponseError);
              }else{
                Monitor.green('上传文件成功：' + md5_path);
                cache[md5_path] = k;// md5_path => key
              }
              console.log('剩余文件数：', --cdn_tasks.length);
              return cb(null, result);
          });
        });
      });

      cdn_tasks.forEach(function (tass) {
        //console.log('#####', tass);
      });


      //====== 如果资源任务为空，不做任何处理
      if(cdn_tasks.length === 0) {
        return Monitor.error('<------ 没有资源需要上传.');
      }

      Monitor.green('开始上传文件, 共有 ' + cdn_tasks.length + ' 个资源等待上传');
      async.parallelLimit(cdn_tasks, 10, function (err, list) {
        if(err) {
          Monitor.error('资源上传失败 ------>');
          console.log(err);
        }else{
          Monitor.green('<------ 资源上传完成');
          if(errors.length > 0){
            Monitor.error('其中失败资源 ' + errors.length + '个，请重新尝试上传');
            console.error(errors);
          }
        }

        //===== 写入上传缓存列表
        if(config.needCache){
          fs.writeFileSync(file_path, JSON.stringify(cache, null ,2),'utf-8');
        }

        if(_.isFunction(done)) {
          return done(err || errors.length, list);
        }
      });
    },

    /***
     * 匹配 文本中的 ssi 片段
     * params:{
     *   html: '',     //html 文本
     *   filePath: '',  //获取html的文件路径
     *   root: '',     //文件存储根路径
     *   env: '',      //生成环境，生产环境，dbeta环境的路径，生成的静态文件路径不同
     *   ssi: [],      // ssi片段的类型, ['share', 'alone'], 对应 output 属性
     *   cache: function(ssiPath, ssiContent){} //获取到片段后的 处理函数,可选
     * }
     * needFlag: true|false 是否需要保留 ssi 标记
     * */
    match_ssi: function (params) {
      var html = params.html || fs.readFileSync(params.filePath, 'utf-8'),
        matches = html.match(/<!--ssi:start[\s\S]*?ssi:end-->/gi) || [],
        output = params.ssi.split(',') || [],
        root = params.root ? params.root : "build/static/" + params.env + "/",
        ssi = [];
      console.log('---matches gm-----');
      console.log(output);
      console.log('---matches gm-----');

      matches.forEach(function (frag) {
        frag.match(/<!--ssi:start name="(.*)" file="(.*)" output="(.*)"-->([\s\S]*)?<!--ssi:end-->/g);
        var ssi_param = {
            name: RegExp.$1,
            file: RegExp.$2,
            output: RegExp.$3
          },
          content = RegExp.$4;
        //base='build/static/production/';
        ssi_param.file = helper.render(ssi_param.file, params, "{key}");
        ssi.push(ssi_param);

        console.log(ssi_param);
        if (_.include(output, ssi_param.output)) {
          if (_.isFunction(params.cache)) {
            params.cache(ssi_param.file, content);
          } else {
            var file_path = root + ssi_param.file;
            var folder_path = path.dirname(file_path);
            mkdirp(folder_path, function (err) {
              if (err) {
                return console.log('folder_err------->' + err);
              }
              fs.writeFile(file_path, content, function (err) {
                if (err) {
                  console.log('file_err------->' + err);
                }
              });
            });
          }
        }

        html = html.replace(frag, '<!--#include file="' + ssi_param.file + '"-->');
      });
      return {
        ssi: ssi,
        html: html
      }
    }
  };

  return {
    publish: function (params, callback) {
      var config = params.config;
      var publishTask = config.map(function (item) {
        return function (handle) {
          gulp.src(params.files, {base: 'build'})
            .pipe(through.obj(function (file, enc, cb) {
              var path = file.path.substring(file.path.indexOf('build/'), file.path.length);
              console.log(chalk.green("Upload : " + path));
              cb(null, file);
            }))
            .pipe(scp(item))
            .on('error', function (err) {
              handle(err, item);
            }).on('finish', function (err) {
              handle(err, item);
            });
        }
      });

      async.series(publishTask, function (err, rest) {
        if (err) {
          console.log('-----app err-----');
          console.log(err);
          console.log(rest);
        }
        callback(err, rest);
      });
    },
    ssi: function (params, callback) {
      var _params = _.merge(params, {
        ssi: 'alone,share',
        slug: req.product.slug || ''
      });

      var match_result = Util.match_ssi(_params);
      return callback(null, match_result);
    },
    render_ssi: function (params, callback) {
      var html = params.html,
        matches = html.match(params.match || /<!--#include file="(.*?)"-->/gi) || [];
      var tasks = matches.map(function (tpl) {
        var m = tpl.match(/file="(.*)"/gi),
          key = RegExp.$1;
        return function (cb) {
          params.getValue(key, function (err, value) {
            cb(err, {tpl: tpl, key: key, val: value || ''});
          });
        };
      });
      async.parallel(tasks, function (err, rest) {
        if (err) {
          return Monitor.error(err);
        }
        //console.log('render ssi--------->');
        //console.log(rest);

        rest.forEach(function (item) {
          html = html.replace(item.tpl, item.val || 'Not Found');
        });
        return callback(err, html);
      });
    },
    static: function (params, callback) {
      var root = 'cached/current/',
        folder_path = root + path.dirname(params.key),
        file_path = root + params.key,
        locale = params.locale;

      Monitor.green('save to----------->' + file_path);
      if (locale == 'zh-CN') params.locale = 'cn';
      if (locale == 'ko') {
        params.locale = 'kr';
      }
      params.path = file_path.replace('.html', '').replace('/', '_');

      mkdirp(folder_path, function (err) {
        if (err) {
          Monitor.error(err);
          callback(err, {});
        }

        fs.writeFile(file_path, params.html, 'utf8', function (err1) {
          //======= 如果是从旧官网抓取的代码，不进行ssi操作
          if (!params.ssi) {
            return callback(err1, {});
          }

          var _params = _.merge(params, {
            root: 'cached/current/',
            filePath: file_path,
            ssi: 'alone,share',
            slug: req.product.slug || '',
            page: path.basename(file_path, '.html')
          });

          var match_result = Util.match_ssi(_params);
          var ssi_html = match_result.html;

          fs.writeFile(file_path, ssi_html, 'utf8', function (err2) {
            callback(err2, match_result);
          });
        });
      });
    },
    build: function (params, callback) {
      var locale = params.locale,
          env = params.env ? params.env : 'production',
          slug = req.product.slug || '';
      manifest = params.manifest;
      if (manifest) from_cache = true;

      if (locale == 'zh-CN') locale = 'cn';
      if (locale == 'ko') {
        params.locale = locale = 'kr';
      }
      html = params.html;

      var root = base + '/build/static/',
        view_path = params.view.replace('.jade', '') + ".html",
        file_path = root + env + params.url + ".html",
        folder_path = file_path.substring(0, file_path.lastIndexOf('/'));
      if (slug) {
        if (file_path.indexOf('/products/' + slug) == -1) {
          file_path = file_path.replace('/products/', '/products/' + slug + "/");
          folder_path = folder_path.replace('/products/', '/products/' + slug);
        }
      }

      //mkdir to static folder
      mkdirp(folder_path, function (err, data) {
        if (err) {
          callback(err, {success: false, status: 422, data: [], extra: {msg: err}});
        }

        console.log('----------->save html to path');
        console.log(file_path);

        fs.writeFile(file_path, html, 'utf8', function (err1) {
          var short_path = file_path.substring(file_path.indexOf('build/'));

          if (err1) {
            callback(err1, {success: false, status: 422, data: [], extra: {msg: err1}});
          } else {
            async.waterfall([
              function (cb) {
                console.log('----------->md5 start');
                Util.md5(html, function (err, rest) {
                  if (err) {
                    cb(err);
                  } else {
                    cb(null, rest);
                  }
                });
              },
              function (rest, cb) {
                console.log('----------->rev start');
                var source = [file_path.substring(file_path.indexOf('build/'))];
                Util.rev(source, rest.styles, env, function (err, manifest) {
                  if (err) {
                    cb(err);
                  } else {
                    cb(null, manifest);
                  }
                });
              },
              function (rest, cb) {
                params.slug = slug;
                params.path = view_path.replace('/', '_')
                  .substring(0, view_path.lastIndexOf('.'));
                params.page = path.basename(view_path, '.html');
                params.filePath = file_path;

                var match_result = Util.match_ssi(params);
                var ssi_html = match_result.html;

                fs.writeFile(file_path, ssi_html, 'utf8', function (err) {
                  err ? cb(err) : cb(null, rest);
                });
              },
              function (manifest, cb) {
                if (from_cache) {
                  return cb(null, {
                    success: true,
                    status: 200,
                    data: [{path: short_path}],
                    extra: {msg: 'build success.'}
                  });
                }
                console.log('----------->publish cdn start');
                Util.publish_cdn(env, function () {
                  cb(null, {
                    success: true,
                    status: 200,
                    data: [{path: short_path}],
                    extra: {msg: 'build success.'}
                  });
                });//end of publish
              }
            ], function (error, result) {
              if (error) {
                console.log(error);
              }
              callback(error, result, manifest);
            });
          }
        });//end of writeFile
      });//end of mkdirp
    },
    Util: Util
  }
};
