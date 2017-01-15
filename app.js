/**
 * dji-official
 * app.js base on koa 2
 *
 * with koa we should add views
 */
process.on('uncaughtException', function(err){
  let exception = {
    type: 'server',
    stack: err.stack || err
  };

  if(typeof settings !== 'undefined' && settings.monitor){
    Monitor.reportException(exception);
  }
  console.log('app crashed: ----->>> ');
  console.log(exception.stack);

  setTimeout(function() {
    process.exit(1); // should exit after all 'uncaughtException' event calls
  }, 3000);
});


let register = require('babel-register');
let polyfill = require("babel-polyfill");
//===== es6 to es5
register({
  presets: ["es2015", "stage-0" ],
  plugins: ['transform-async-to-generator']
});

let Koa = require('koa');

let logger = require('koa-logger');
let kc = require('koa-controller');
let convert = require('koa-convert');

let koaBody = require('koa-body');
let requestId = require('koa-request-id');
let session = require('koa-session');
let csrf = require('koa-csrf');

console.log('babel transform runtime >>>>>>');
let path = require('path');
let mkdirp = require('mkdirp');

let custom_middlewares = require('./config/http');
let bootstrap = require('./config/bootstrap').bootstrap;
console.log('<<<<<< babel transform end.');


/**
 * config app and load settings
 *
 * app.name: 应用名称
 * app.keys: 可以用于 seesion csrf cookie 加密
 * app.proxy: 是否允许从代理头部，获取参数
 * app.env: 应用环境
 *
 * app.convert: 用于旧版本的兼容 custom
 * 具体参见文档  https://github.com/guo-yu/koa-guide
 * */
let app = new Koa(); //启动服务
Object.assign(app, {
  name: 'dji-official',
  keys: [settings.keys['app_key']], //session & cookie keys
  basePath: process.cwd(),
  proxy: true
});
app.convert = function(mid){ //转换 1.x 的中间件
  app.use(convert(mid));
}
app.on('error', function(err, ctx){
  Monitor.error('server error: ---------->');
  console.log(err.stack);
});

//====== 加载配置，并启动服务
bootstrap(app, function(){

  /**
   * add middlewares to kao app
   * convert 用于旧版本的兼容
   * */
  app.convert(logger()); //logger

  app.convert(requestId());


  mkdirp('.tmp/public/uploads'); //创建上传资源存放文件夹
  app.use(koaBody({
    multipart: true,
    formidable: {
      keepExtensions: true,
      uploadDir: path.join(__dirname, '.tmp/public/uploads'),
      //onFileBegin: function (name, file) {}
    }
  }));

  app.convert(session(app));
  //app.convert(csrf());

  //====== 自定义中间件
  custom_middlewares(app);

  app.convert(kc.tools()); //optional
  app.convert(kc.router({
    controllerPath: app.basePath + '/controllers/{controller}Controller.js',
    constraintPath: app.basePath + '/constraints/{constraint}Constraint.js',
    logger: console.log // custom logger function
  }));

  //====== start app
  let server = app.listen(settings.port || 3000);


  // 这一行代码一定要在最后一个app.use后面使用
  // 不在线上环境建立 socket 连接
  if(settings.publish !== 'production'){
    try{
      let Socket = require('./services/Socket');
      let socket = new Socket(server);
      socket.connect(); //建立Socket 连接
    }catch(ex){
      Monitor.error('sokect connect error:----------->');
      console.log(ex);
    }
  }
});
