/**
 * Socket Service
 */
var io = require('socket.io');

var child_process = require('child_process');
var ansi2html = require('ansi2html');
var tree_kill = require('tree-kill');
var fs = require('fs');
var root = process.cwd() + "/publish-scripts/";

class Socket {
  constructor(server) {
    this.socket = {};
    this.io = io.listen(server);
  }

  connect() {
    var _this = this;
    this.io.on('connection', function (socket) {
      _this.socket = socket;

      socket.emit('io-connected', {connected: true});
      socket.on('service', function (data) {
        var register = data.register || [],
            events = Array.isArray(register) ? register : [register];
        //===== 监听客户端注册的事件
        events.forEach(function (evt) {
          socket.on(evt, function (req) {
            var shell = SocketHelper.makeShell(socket);
            var sh = req.shell || evt,
                sh_params = req.params || [],
                sh_root = root || req.root;

            console.log('exec shell by params:--------->');
            console.log(sh_params);
            shell.spawn(sh_root + sh, sh_params);
          });
        });
        socket.emit('ready', {reday: true});
      });

      //==== kill child_process
      socket.on('kill', function () {
        var child = socket.spawn;
        console.log('kill process: ' + child.pid);
        tree_kill(child.pid, 'SIGKILL');
      });
    });
  }
}


var SocketHelper = {
  makeShell: function(socket){
    return {
      spawn: function(cmd,opt,callback){
        if(!opt){
          opt=['--color']; //cmd option
        }
        else {
          opt.concat('--color');
        }

        if(!fs.existsSync(cmd)){
          Monitor.error('file not found --------->');
          console.log(cmd); //log exception
          var msg = 'file not found --------->' + cmd;
          socket.emit('log-data',{ status:'error',data: {msg: msg} });
          return false;
        }

        var child = child_process.spawn(cmd,opt);
        socket.spawn = child;

        SocketHelper.execCmd(child,socket,callback||function(err,msg){
          if(err){
            socket.emit('log-data',{ status:'error',data: err });
          }else{
            socket.emit('log-data',{ status:'close',data: msg });
          }
        });
      }
    };
  },
  execCmd: function(child,socket,callback){
    var hasError = false;

    child.stdout.on('data', function (buffer) {
      var log = buffer.toString();
      //console.log(log);//print log
      socket.emit('log-data',{ status:'data',data: ansi2html(log.replace(/\n/g, "<br/>"))});
    });
    child.stderr.on('data', function (buffer) {
      var err = buffer.toString();
      console.log('--------error------');
      console.log(err);

      hasError = true;
      socket.emit('log-data',{ status:'error',data: ansi2html(err.replace(/\n/g, "<br/>"))});
    });
    child.on('close', function (code) {
      console.log("exit with code: "+code);
      socket.emit('log-data',{ status:'close',data: "exit with code: "+code});

      tree_kill(child.pid, 'SIGKILL');
      if(!hasError){
        callback(null,{code: code});
      }
    });
  }
};

module.exports = Socket;