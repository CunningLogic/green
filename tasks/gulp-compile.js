/**
 * compile assets from views
 */
var through = require('through2');
var gutil = require('gulp-util');
var File = gutil.File;
var Q = require('q');
var crypto = require('crypto');

var fs = require('fs');
var path = require('path');
var jade = require('jade');
var async = require('async');
var _ = require('lodash');
var useref = require('node-useref');
var Builder = require('../services/Builder.js')({});

var tar = require('gulp-tar');
var gzip = require('gulp-gzip');
var gunzip = require('gulp-gunzip');
var untar = require('gulp-untar');
var rename = require("gulp-rename");

var gulp = null;
var gulp_concat = require('gulp-concat');
var gulp_concat_css = require('gulp-concat-css');
var gulpif = require('gulp-if');


module.exports = function (_gulp, argv) {

  var cdn_manifest = {},
      change_log = {}, //从文件中读取的文件的 md5信息
      change_map = {}; //用于存储本次编译产生的 md5信息,会被存储未log，既是下一个 change_log
  var env = argv.env ? argv.env : 'staging',
      path = argv.path ? argv.path.split(',') : 'views/**/*.{html,jade}',
      root = process.cwd(),
      errors = [],
      tasks = []; //compile task for each file
  gulp = _gulp; //初始化gulp变量，以供本模块内调用
  change_log = {};
  CompileHelper.env = env;


  gulp.task('compile', ['auto', 'collector'], function () {
    var deferred = Q.defer();

    var log_path = root + "/build/change.log",
        log_exists = fs.existsSync(log_path),
        manifest_path = root + '/build/assets/rev-manifest.json',
        manifest_exists = fs.existsSync(manifest_path);
    if (log_exists) {
      change_log = JSON.parse(fs.readFileSync(log_path, 'utf-8') || '{}')
    }
    //====== clear manifest file, then start
    if(manifest_exists){
      fs.writeFileSync(manifest_path, "{}", 'utf-8');
    }

    async.series(tasks, function (err) {
      if (err) console.error(err);

      gulp.start(["gzip"]); //执行打包压缩任务
      //======记录变更信息到日志
      fs.writeFileSync(log_path, JSON.stringify(change_log), 'utf-8');

      var config = Object.assign({needCache: true}, settings.qbox);
      Builder.Util.publish_qbox(cdn_manifest, config, function () {
        Monitor.green('------upload cdn finish---------');
        cdn_manifest = change_log = change_map = tasks = null;

        Monitor.error('compile errors---------> ' + errors.length);
        if(errors.length > 0){
          console.log(errors); //output errors
        }
        deferred.resolve();
      });
    });

    return deferred.promise;
  });

  /**
   * 压缩，并解压缩，编译后的views文件夹，便于上传到服务器
   * */
  gulp.task('gzip', function () {
    return gulp.src('build/views/**/*')
      .pipe(tar('views.tar'))
      .pipe(gzip())
      .pipe(gulp.dest("build/compressed"));
  });
  gulp.task('un-gzip', function () {
    return gulp.src('build/compressed/views.tar.gz')
      .pipe(gunzip())
      .pipe(untar())
      .pipe(rename(function (path) {
        path.dirname = path.dirname.replace('build/compressed', 'views');
      }))
      .pipe(gulp.dest('build'))
  });

  /**
   * gulp-cloudfront-invalidate
   * 更新 cloudfront 资源
   *
   * www1  E3DBEWCF684AG2
   * www2  E2F684S7EWRYBH
   * www3  E2T0MQY62IZKRJ
   * www4  E2DUDAUEJ0UHMI
   * www5  ETQT6NJYXRRBT
   * */
  gulp.task('update-cdn', function () {
    var distributionList = ['E3DBEWCF684AG2','E2F684S7EWRYBH','E2T0MQY62IZKRJ','E2DUDAUEJ0UHMI','ETQT6NJYXRRBT'];
    var cf_settings = {
      distribution: distributionList[argv.cdn||0], // Cloudfront distribution ID
      paths: path,          // Paths to invalidate
      accessKeyId: settings['cdn_keys'].accessKeyId,             // AWS Access Key ID
      secretAccessKey: settings['cdn_keys'].secretAccessKey,         // AWS Secret Access Key
      //sessionToken: '...',            // Optional AWS Session Token
      wait: true                      // Whether to wait until invalidation is completed (default: false)
    }
    var cloudfront = require('gulp-cloudfront-invalidate')
    console.log(cf_settings);

    return gulp.src('*')
      .pipe(cloudfront(cf_settings));
  });


  /**
   * 遍历文件夹，创建编译任务
   * */
  gulp.task("collector", function () {
    //======同步 除了 jade，或者 html的资源
    gulp.src(['views/**/*', '!views/**/*.{jade,html}'])
      .pipe(gulp.dest('build/views'));

    var src_path = Array.isArray(path) ? path : [path];
    //========== 编译jade 或者 html 资源
    return gulp.src(src_path)
      .pipe(through.obj(function (file, enc, cb) {

        tasks.push(function (callback) {
          var matches = [],
              stop = false; // assets matches

          gulp.src(file.path, {base: 'views/'})
            .pipe(through.obj(function (file, enc, cb) {
              Monitor.green('start build--->' + file.path);
              var content = file.contents.toString();

              CompileHelper.combo_assets(content, function (err, buffer, tags) {
                file.contents = buffer;
                file.combo_tags = tags;
                cb(err, file);
              });
            }))
            .pipe(through.obj(function (file, enc, cb) {
              var content = file.contents.toString(),
                  tags = file.combo_tags;
              CompileHelper.md5_jade(content, tags, cdn_manifest, function (err, rest, buffer) {
                var html_hash = err ? '' : crypto.createHash('md5')
                  .update(buffer.toString(), 'utf8').digest('hex');

                //===== 不编译未更改的文件
                var short_path = file.path.substring(file.path.indexOf('views'));
                if (err) {
                  stop = true;
                  Monitor.error('compile exception-------------------->' + short_path);
                  typeof err == 'string' ? Monitor.error(err) : console.error(err);
                  console.log('');

                  //====== 记录错误，并统一输出, 生成环境不输出警告
                  if(err.type !== 'warn' || env !== 'production'){
                    errors.push({path: short_path, err: err});
                  }
                  //=== 如果是 warn 不中断编译执行
                  err.type === 'warn' ? cb(null, file) : cb(err, file);
                }
                else if (change_log[file.path] === html_hash) {
                  //change_map[file.path] = html_hash;
                  stop = true;
                  Monitor.error('not modify-------------------->' + short_path + ' ' + html_hash);
                  console.log('');
                  cb(err, file);
                } else {
                  file.md5_result = rest;
                  file.contents = buffer;
                  matches = rest.styles;
                  change_log[file.path] = html_hash;
                  cb(err, file);
                }
              });
            }))
            .pipe(through.obj(function (file, enc, cb) {
              if (!stop) {
                var path = file.path.replace('views', 'build/views');
                fs.writeFileSync(path, file.contents.toString());
                file.save_path = path;
                cb(null, file);
              } else {
                cb(null, file);
              }
            }))
            .pipe(through.obj(function (file, enc, cb) {
              if (!stop) {
                CompileHelper.rev_assets({
                  env: env,
                  source: file.save_path,
                  data: file.md5_result
                }, function (err, manifest) {
                  cdn_manifest = _.merge(manifest, cdn_manifest);
                  cb(err, file);
                });
              } else {
                cb(null, file);
              }
            }))
            .on('finish', function () {
              callback();
            });
        });

        cb(null, file); //end through
      }));
  });

};

/**
 *
 * 编译助手，
 * 执行 资源合并，md5，引用替换，cdn 发布
 *
 * */
var CompileHelper = {
  env: 'staging',
  replace: function (tpl, path, key, is_invalid) {
    var tag = tpl.replace("{path}", path || '').replace(',"{key}"', (',"' + key + '"') || '');
    return tag + (is_invalid ? ")" : "");
  },
  scripts_path: function (path, key, is_invalid) {
    return this.replace('src=javascript_path("{path}","{key}"', path, key, is_invalid);
  },
  styles_path: function (path, key, is_invalid) {
    return this.replace('href=stylesheet_path("{path}","{key}"', path, key, is_invalid);
  },
  images_path: function (path, key, is_invalid) {
    var is_icon = path.has('.ico');
    return this.replace((is_icon ? 'href' : 'data-layzr') + '=image_path("{path}","{key}"', path, key, is_invalid);
  },
  scripts: 'script(src=javascript_path("{path}"))',
  link: 'link(rel="stylesheet",href=stylesheet_path("{path}"))',

  //========combo assets from views
  combo_assets: function (content, callback) {
    var build_list = content.match(/<!--build:(css|js)[\s\S]*?endbuild-->/gi) || [],
      build_lines = build_list.join('\n').replace(/\r\n/g, '\n').split('\n'),
      build_html = ''; //资源构建片段
    build_lines = build_lines.map(function (line) {
      return line.replace(/(^\s+)|(\s$)/g, '');
    });
    build_html = build_lines.join('\n');

    var html = jade.render(build_html, _.merge(helper, {cache: false, pretty: true}), {}),
      ref_html = html.replace(/<!--endbuild-->/g, '\n<!--endbuild-->'),
      rest = useref(ref_html);

    var assets_data = rest[1],
      base_path = process.cwd() + '/.tmp/public/',
      index = 0,
      combo_task = [],
      tags = []; //assets tags after jade

    console.log('-----------combo assets-----------');
    console.log(assets_data);

    for (var type in assets_data) {
      if (assets_data.hasOwnProperty(type)) {
        var type_assets = assets_data[type],
          dest_path = "";

        for (var dest in type_assets) {
          if (type_assets.hasOwnProperty(dest)) {
            var assets = type_assets[dest].assets,
              name = path.basename(dest),
              dir = path.dirname(dest),
              to = "build/" + (dir !== '.' ? (dir + "/") : '') + name;
            assets = assets.map(function (src) {
              return base_path + src.replace(/^\//, '');
            });

            //====== not minify in this step
            if (type == 'js') {
              var script_tag = CompileHelper.scripts.replace('{path}', to);
              dest_path = base_path + "scripts/" + "build/" + dir;
              content = content.replace(build_list[index], script_tag);

              (function (assets, name, dest_path) {
                combo_task.push(function (cb) {
                  gulp.src(assets)
                    .pipe(gulp_concat(name))
                    .pipe(gulp.dest(dest_path))
                    .on('finish', function (err) {
                      cb(err);
                    });
                });
              })(assets, name, dest_path);

              tags.push(script_tag);
            }
            else if (type == 'css') {
              var style_tag = CompileHelper.link.replace('{path}', to);
              dest_path = base_path + "styles/" + "build/" + dir;
              content = content.replace(build_list[index], style_tag);

              (function (assets, name, dest_path) {
                combo_task.push(function (cb) {
                  gulp.src(assets)
                    .pipe(gulp_concat_css(name))
                    .pipe(gulp.dest(dest_path))
                    .on('finish', function (err) {
                      cb(err);
                    });
                });
              })(assets, name, dest_path);

              tags.push(style_tag);
            }
            index += 1;  //取资源索引，义工替换
          }
        }
      }
    }//end of build assets

    async.parallel(combo_task, function (err) {
      callback(err, new Buffer(content), tags);
    });
  },
  md5_jade: function (content, tags, cdn_manifest, callback) {
    console.log('--------md5 for jade--------');
    var assets_reg = /(\/\/|<!--)?(script|img).*\(.*src=(("|')\/)?(javascript|image).*\)|link.*\(.*href=(("|')\/)?(style|image).*\)|.*(data-layzr|data-.*src)=(("|')\/)?(image).*\)/g;
    var asssets_list = content.match(assets_reg) || [],
      assets_lines = asssets_list.join('\n').replace(/\r\n/g, '\n').split('\n');

    assets_lines = assets_lines.filter(function (line) {
      var has_var_in_path = false;
      if (/#{.*?}.*\.(jpg|png|gif|ico)/g.test(line.toLowerCase())) {
        has_var_in_path = true;
        Monitor.error('warn: src attr can not use #{var},will ignore this.');
        console.log(line);
      }
      return !/(^\/\/)|(^<!--)/.test(line) && !has_var_in_path;
    }).map(function (line) {
      return line.replace(/(^\s+)|(\s$)|(#{.*?})/g, '');
    });
    //=== concat combo tags
    tags.forEach(function (item) {
      if (assets_lines.indexOf(item) == -1) {
        assets_lines.push(item);
      }
    });

    console.log('');//换行
    console.log(assets_lines);

    var leng = assets_lines.length;
    var html = leng > 0 ? jade.render(assets_lines.join('\n'), _.merge(helper, {cache: false, pretty: true}), {}) : '';

    try {
      Builder.Util.md5(html, function (err, rest) {
        var invalid = [];
        assets_lines.forEach(function (item) {
          if (/.*(\/(styles|scripts|images|fonts).*)('|")/.test(item)) {
            var m = RegExp.$1;
            if (m.has(','))
              m = m.substring(0, m.indexOf(',')).replace(/'|"/, '');
            invalid.push(m);
          }
        });

        //console.log(rest);

        //========替换页面中的资源引用
        var manifest = rest.manifest,
            ref_list = rest.page_ref,
            replaced = {};

        ref_list.filter(function (ref) {
          var has = replaced[ref];
          if (!has) replaced[ref] = true;
          return !has;
        }).forEach(function (ref) {
          Monitor.green(ref);  //log ref link
          ref.match(/^\/(scripts|styles|images|fonts)/);
          var type = RegExp.$1,
            assets_path = CompileHelper[type + '_path'];  //assets type

          var key = ref.replace(/^\//, ''),
            m_key = key.replace(type, type + "/mobile"),
            src_reg = /(styles|scripts|images|fonts)\//,
            path = manifest[key] || '',
            m_path = manifest[m_key] || '',
            replace_assets = (path || m_path || '').replace(src_reg, ''),
            is_invalid = invalid.indexOf(ref) > -1;

          var assets_key = (path.match(/-[0-9a-f]{8,64}-?/g) || [''])[0].replace('-', ''),
            m_assets_key = (m_path.match(/-[0-9a-f]{8,64}-?/g) || [''])[0].replace('-', ''),
            assets_src = replace_assets.replace('-' + (assets_key || m_assets_key), '').replace(/^mobile\//, '');
          assets_key = assets_key + "-" + m_assets_key; //to string key_path-mobile_key_path

          if (assets_path) {
            replace_assets = assets_path.call(CompileHelper, assets_src, assets_key, is_invalid);

            var match_reg = new RegExp('(src|href|url|data-layzr|data-.*src)=(\'\/|\"\/)?.*' + key.replace(src_reg, '') + '(\'|\")?', 'g');
            var matches = (content.match(match_reg) || [''])[0].split(','),
              match_str = matches[0];
            if (matches.length > 1) {
              matches.forEach(function (item) {
                if (item.has(key.replace(src_reg, ''))) {
                  item.match(/(.*-src)=/); //match data-src,dui-src,*-src
                  replace_assets = replace_assets.replace('data-layzr', RegExp.$1 || 'data-src');
                  match_str = item;
                }
              });
            }

            if (match_str) {
              if (match_reg.test(match_str)) {
                var assets_name = RegExp.$1;
                if (/(.*-src)/.test(assets_name)) {
                  replace_assets = replace_assets.replace('data-layzr', assets_name || 'data-layzr');
                }
              }
              var replace_reg = new RegExp(match_str.replace(/\//g, '\\/')
                .replace(/\./g, '\\.').replace(/\(/g, '\\('), 'g');
              content = content.replace(replace_reg, replace_assets);
            }
            //console.log(match_str);
            console.log(replace_assets);
          }
        });

        callback(err, rest, new Buffer(content));
      }, cdn_manifest, CompileHelper.env);
    } catch (ex) {
      callback(ex, {}, {});
    }

  },
  rev_assets: function (params, callback) {
    console.log('--------rev assets ref--------');

    Builder.Util.rev(
      [params.source],
      params.data.styles,
      params.env,
      function (err, manifest) {
        callback(err, params.data.manifest || manifest);
      });
  }
};
