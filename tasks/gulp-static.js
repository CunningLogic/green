//=====获取环境参数 like gulp task --product name,
//=====and you can get product

var gulp_data = require('gulp-data');
var jade = require('gulp-jade');
var gcallback = require('gulp-callback');
var through = require('through2');

var async = require('async');
var Q = require('q');
var chalk = require('chalk');
var mkdirp = require('mkdirp');
var util = require('lodash');
var fs = require('fs');

//=====linux file copy
var scp = require('gulp-scp2');

var config_i18n = require('../config/i18n'),
    locales = config_i18n.i18n.locales;
var root_tpl = "build/static/origin/{locale}/{dir}",
    root = root_tpl, //生成的根路径
    source = "", //源文件
    cache = {},
    dirList = [],
    tpl_data = {
      fetch: function () {},
      bus: function(res,view,back){
        back(res);
      }
    }; //模版数据

module.exports = function (gulp, argv) {
  var slug = argv.product,
      product_pages = argv.pages,
      page = argv.page;

  /***
   * publish static file to server
   *
   * from build/static
   * ***/
  gulp.task('publish-static',function(done){
    var private_key='',//fs.readFileSync(process.cwd()+"/dbeta_rsa",'utf-8'),
        folder_path='build/static/production/';
    var file_path=process.cwd()+'/'+folder_path+"en/products/focus/index.html";
    console.log(file_path);     
 
    var scp = require('shelljs');
    var shell = require('shelljs');
    shell.exec('scp '+file_path+" official@54.204.13.248:build/static");    

    /*scp.send( {
      file: file_path,
      host: '54.204.13.248',
      user: 'official',
      password: 'L0Ncq3poRjoiExme',
      path: '/home/official/build'
    }, function(err){ 
      console.log('---scp2----');
      console.log(err);
      done();
   }) */
    

    /*return gulp.src(folder_path+'/en/products.html')
      .pipe(through.obj(function (file, enc, cb) {
        var path=file.path.substring(file.path.indexOf('build/'),file.path.length);
        console.log(chalk.green("Upload : "+path));
        cb(null, file);
      }))
      .pipe(scp({
        host: '50.16.187.241',
        username: 'official',
        password: 'L0Ncq3poRjoiExme',
        dest: 'build'
      }))
      .on('error', function(err) {
        console.log(err);
      });*/
  });


  /***
   * product task
   *
   * run like - gulp build --product phantom3
   * build product to static
   * ***/
  gulp.task('product', function (done) {
    var page_data = {},
        special = ['spec','download','video','faq'],
        special_jade = special.map(function(item){
          return "views/products/"+item+".jade";
        });
    //====设置需要生成的原文件
    if(!product_pages){
      source = special_jade.concat(['views/products/' + slug + '/**/*.jade']);
    }else{
      source = product_pages.map(function(item){
        if(special.indexOf(item)>-1)
          item=slug+"/"+item;
        return "views/products/"+item+".jade";
      });
    }

    root = root_tpl.replace('{dir}', "product/" + slug);

    //====设置 helper 变量
    helper.set_page('product');
    helper._=util;

    try {
      page_data = require('../remote/product');
    } catch (e) {
      page_data.fetch = function (slug, callback) {
        callback(null, {});
      };
      console.error('module: remote/product, not found.');
    }

    //===如何获取数据
    tpl_data.fetch = function (param, handler) {
      var locale = param.locale,
          key=locale+"_"+slug;
      if(cache[key]){
        //console.log('---------->'+key);
        //console.log(cache[key]);
        handler(null,cache[key]||{});
      }else{
        page_data.fetch(slug, function (err, data) {
          if (!err) cache[key] = data;
          handler(null,data||{});
        });
      }
    };
    tpl_data.bus = function(res,param,back){
      var product=res.product,
          sub=function(){
            helper.set_tab('feature');
          },
          page=param.view.replace('products/'+param.slug+'/','')
               .replace('products/','');
      var special={
        index:function(){
          helper.set_tab('overview');
        },
        feature:function(){
          helper.set_tab('feature');
        },
        spec:function(){
          helper.set_tab('specs');
          res['spec']=product["tech_specs"]||{categories:[]};
        },
        download:function(){
          helper.set_tab('downloads');
          res['download']=product["download"]||{categories:[]};
        },
        video:function(){
          helper.set_tab('videos');
          res['video']=product["video"]||{groups:[]};
        },
        faq:function(){
          helper.set_tab('faq');
          res['faq']=product["faq"]||{groups:[]};
        }
      };
      (special[page]||sub).call(special);

      console.log("=====current tab=====>"+helper.currentTab);
      return back(res);
    };


    return gulp.run('render', function () {
      done(); //finish product task
    });

  });

  /***
   * page task
   *
   * run like - gulp build --page homepage
   * build product to static
   * ***/
  gulp.task('page', function (done) {
    var path = page.replace('.jade', ''),
        page_data = {};

    try {
      page_data = require('../remote/' + page);
    } catch (e) {
      page_data.fetch = function (locale, callback) {
        callback(null, {});
      };
      console.error('module: remote/' + page + ", not found.");
    }

    //====设置 helper 变量
    //helper.set_page('home');
    helper._=util;

    source = page.indexOf('.jade') > -1 ? page : page.concat('.jade');
    if (source.indexOf('views/') == -1)
      source = 'views/' + source;
    root = root_tpl.replace('/{dir}','');

    tpl_data.fetch = function (param, handler) {
      page_data.fetch(param.locale, function (err, data) {
        handler(null, data);
      });
    };

    gulp.run('render', function () {
      done(); //finish product task
    });
  });

  gulp.task('mkdir', function () {
    var deferred = Q.defer();

    var exec = require('child_process').exec;
    //=====make dir with locales, like cn/ en/ ja/
    locales = locales.filter(function (name) {
      return name != 'zh-CN';
    });
    var mkDirTask = locales.map(function (name) {
      return function (callback) {
        var dir_path = root.replace('{locale}', name);
        dirList.push({locale: name, path: dir_path});
        mkdirp(dir_path, function (err) {
          if (err && err.code === 'EACCES') {
            console.log('rm -rf ' + dir_path);
            //=====if dir exists,rm and create
            exec('rm -rf ' + dir_path, function (err, out) {
              if (err) {
                console.error(err);
              } else {
                mkdirp(dir_path, function () {
                  callback();
                });
              }
            });
          } else if (err) {
            console.error(err);
          } else {
            callback();
          }
        });
      };
    });
    //====执行指定的任务序列
    async.series(mkDirTask, function (err, res) {
      if (!err) {
        deferred.resolve();
      }
    });
    return deferred.promise;
  });

//====render dep on mkdir
  gulp.task('render', ['mkdir'], function () {
    var deferred = Q.defer();
    var renderTask = [];

    gulp.src(source).on('data', function (file) {
      dirList.forEach(function (dir_path) {
        var locale = dir_path.locale;
        locale = (locale == 'cn' ? 'zh-CN' : locale);

        renderTask.push(function (cb) {
          var stream = gulp.src(file.path)
            .pipe(gulp_data(function (file, handler) {
              var view = (file.path.match('views/.*')[0] || '')
                .replace(/\..*/, '').replace('views/', '');
              var param = {locale: locale, slug: slug, view: view};
              console.log("---> render page: " + view + " with locale " + locale);

              helper.locale = helper.I18n.locale = locale;
              tpl_data.fetch(param, function (err, res) {
                if (view === 'homepage') res['home_page'] = true;
                //bus as business
                tpl_data.bus(res,param,function(bus_data){
                  console.log(bus_data);

                  var locals = util.merge({},helper,bus_data);
                  API.I18n.translate({view:view,data:locals,locale:locale}, function (err, trans_data, render) {
                    if (err) console.error(err);
                    handler(null, locals);
                  });
                });
              });
            }))
            .pipe(jade({
              pretty: true
            }))
            .pipe(gulp.dest(dir_path.path + '/'))
            .pipe(gcallback(function () {
              cb();
            }));

          stream.on('error', function (err) {
            console.error(err);
          });
        });
      });
    }).on('end', function () {
      console.log('----end----');

      //====执行指定的任务序列
      async.series(renderTask, function (err, res) {
        if (!err) {
          deferred.resolve();
        } else {
          console.error(err);
        }
      });
    });

    return deferred.promise;
  });
};
