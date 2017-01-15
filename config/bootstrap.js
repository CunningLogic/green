/**
 * Bootstrap 启动配置
 *
 * An asynchronous bootstrap function that runs before your Sails app gets lifted.
 * This gives you an opportunity to set up your data model, run jobs, or perform some special logic.
 *
 * 注意 本文件中定义的全局属性方法 只能在服务器端使用
 * 不能在 assets 目录的client JS中使用
 */

var cacheService = require('../services/Cache');
var settings = require('./application').application;
var _ = require('lodash');
var path = require('path');
var fs = require('fs');
var os = require('os');

var gulp = require('gulp');
var gulpTask = require('../gulpfile');
var JsonDBervice = require('../services/JsonDB');

module.exports.bootstrap = function (app, cb) {
  if (!settings.keys) {
    return console.error("\nError: You don't have private settings, please ask team developer to get.\n");
  }

  //====== 扩展 kao app 对象
  Object.assign(app, {
    type: 'Koa 2',
    isNode: true,
    viewPath: app.basePath + '/' + settings.view_src || 'views',
    keys: ['0266d0567aef9b7ab3bc4eb1eadegr68']
  });

  //====== 扩展配置项 settings
  let conf = settings;
  conf.env = conf.env || conf.official.env;
  conf.origin = conf.official[conf.env].origin;
  conf.remote_env = conf.remote_env || conf.remote.env;
  conf.remote_origin = conf.remote[conf.remote_env].origin;
  conf.is_production = conf.redis == 'aws' || conf.redis == 'dji' || conf.publish == 'production';
  conf.is_preview = conf.publish == 'preview';
  conf.base_path = app.basePath;

  //=== 获取本地IP地址,便于查看当前页面对应的服务器
  let IPv4 = "127.0.0.1",
      network = os.networkInterfaces(),
      eth = network["eth0"] || network["en0"] || [];
  for (var i = 0, len = eth.length; i < len; i++) {
    if (eth[i].family == 'IPv4') {
      IPv4 = eth[i].address;
    }
  }
  conf.local_ip = IPv4;

  if (!conf.cdn['development'])
    conf.cdn['development'] = settings.cdn['production'];

  global.settings = conf;
  global._ = _; //global use of lodash
  global.Monitor = require('../services/Monitor');
  global.app = app;

  //====== string has value
  String.prototype.has = function (value) {
    return this.indexOf(value) > -1;
  };

  //====== run gulp watch task, only in dev and stating
  // if integrate gulp was true
  // then start gulp tasks
  if (settings.integrate_gulp === undefined || settings.integrate_gulp) {

    //run gulp auto & watch task
    if (gulpTask && gulpTask.start) {
      var tasks = ['auto'];
      //=== not watch on production or preview
      if (!settings.is_production && !settings.is_preview) {
        tasks.push('watch');
      }

      gulpTask.start(tasks);
    }
  }

  console.log('==========> app started');

  //==== connect db
  var dbPath = app.basePath + conf.db_path;
  global.JsonDB = new JsonDBervice(dbPath);

  cacheService(function (err, cache) {
    global.Cache = cache;
    cb(err, cache); //start end
  });
};

