/**
 * monitor our web site
 */
var chalk = require('chalk');
var API = require('./API_Base')({});

module.exports={
  log: function(msg,color){
    console.log(chalk[color]?chalk[color](msg):msg);
  },
  green: function(msg){
    console.log(chalk.green(msg));
  },
  error: function(msg, exception){
    console.log(chalk.red(msg));

    if(settings && settings.monitor){
      Monitor.reportException(exception);
    }
  },
  reportException: function(ex, done){
    //http://www.dbeta.me/api/monitor/report
    if(!ex || !(settings && settings.monitor)) { return false; }

    API.request('get', 'http://www.dbeta.me/api/monitor/report',{
      name: 'exception/report',
      page: ex.page || '',
      priority: ex.priority || 5,
      data: JSON.stringify({
        type: ex.type || 'server',//default is server exception
        url: ex.url || '',  //if api , include api url
        server: settings.server_name + ':' + settings.local_ip,
        env: settings.publish || settings.env,
        exception: ex.stack || ex
      }),
      except: 'page'
    },function(err, rest){
      console.log('####>>>>>>', rest);
    },'string');
  }
};
