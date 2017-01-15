var gulp = require('gulp');
var mkdirp = require('mkdirp');

//=====获取环境参数 like gulp task --product name,
//=====and you can get product
var argv = require('optimist').argv;

global.settings = require('./config/application').application;
global.helper = require('./helper/global').bind({});
//global.API = require('./services/API');
global.Monitor = require('./services/Monitor');

var bootstrap = require('./config/bootstrap').bootstrap;
var tasks = ['gulp-static', 'gulp-assets', 'gulp-compile', 'gulp-doc', 'gulp-optimize-images'];

//start and add settings
if (typeof appStart === 'undefined' && argv.env === "gulp") {
  var env = argv.env;
  if (env == 'production') {
    env = 'production'
  }
  else if (env == 'dbeta' || env == 'staging') {
    env = 'staging'
  }
  else {
    env = 'development'
  }
  settings.env = env;
  settings.remote_env = env;
  bootstrap({}, function () {});//初始化
} else {
  if (bootstrap){
    bootstrap({}, function () {});//初始化
  }
  tasks.push('gulp-watch');
}

(function loadTasks() {
  tasks.forEach(function (task) {
    require('./tasks/' + task)(gulp, argv);
  });
})();

module.exports = gulp;
