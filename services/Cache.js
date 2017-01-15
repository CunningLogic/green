var util=require('lodash');
var redis = require("redis");
var LRU = require("lru-cache");

module.exports=function(callback){
  //=====app cache with lru
  var options = {
      max: 10*1024*1024,//max size is 10 MB
      maxAge: 24 * 1000 * 60 * 60, //one week
      dispose: function(key,cache){
        //console.log('----delete cache--->'+key);
        var entity=cache.ref,
            cache_key=cache.key||key;
        cache.scope.split('.').forEach(function(scope){
          entity=entity[scope];
        });
        delete entity[cache_key];
      },
      length: function (cache) {
        //console.log('----cache length---');
        //console.log(appCache._length);
        return cache.length||100;
      }
    },
    appCache = LRU(options);

  //=====redis cache
  var Client={
    create:function(){
      //====== 创建client
      if(settings.redis=='aws'){
        Client.write = [redis.createClient('6379','redis-for-www-001.tgcamz.0001.use1.cache.amazonaws.com')];
        Client.read =[]; //read clients
        Client.read.push(redis.createClient('6379','redis-for-www-002.tgcamz.0001.use1.cache.amazonaws.com'));
        Client.read.push(redis.createClient('6379','redis-for-www-003.tgcamz.0001.use1.cache.amazonaws.com'));
      }
      else if(settings.redis=='dji'){
        Client.write = [redis.createClient('6379','10.0.1.37')];
        Client.read =[]; //read clients
        Client.read.push(redis.createClient('6379','10.0.1.37'));
        Client.read.push(redis.createClient('6379','10.0.1.36'));
      }
      else{
        var client = redis.createClient();
        Client.write = [client];
        Client.read = [client];
      }
      //======= 监听client错误
      Client.read.forEach(function(client){
        Monitor.green("----------> connect to redis (read); "+ client.address);
        client.on("error", function (err2) {
          client.error=true;
          console.log("Redis Error (read):" + err2);
        });
      });
      Client.write.forEach(function(client){
        Monitor.green("----------> connect to redis (write); "+ client.address);
        client.on("error", function (err2) {
          client.error=true;
          console.log("Redis Error (write):" + err2);
        });
      });
    },
    instance:function(type){
      var client = {};
      if(type=='write' && this.write){
        client = this.write[0];
        if(this.write.length > 1){
          client = this.write[this.random(this.write.length)];
        }
      }else if(type=='read' && this.read){
        client = this.read[0];
        if(this.read.length > 1){
          client = this.read[this.random(this.read.length)];
        }
      }
      return client
    },
    random:function(length){
      return parseInt(Math.random()*length);
    }
  };
  Client.create();// 创建 redis 读，写实例

  /**
   * Cache 全局对象
   * 抽象接口，供外部调用的方法
   * 与具体使用何种缓存无关
   */
  return callback(null,util.merge({},{
    get:function(key,callback){
      this._invoke('get',arguments,'read');
    },
    hget:function(key,filed,callback){
      this._invoke('hget',arguments,'read');
    },
    hgetall:function(key,callback){
      this._invoke('hgetall',arguments,'read');
    },
    set:function(key,value){
      if (typeof value != 'undefined'){
        this._invoke('set',arguments,'write');
      }
    },
    hset:function(key,filed,value,callback){
      this._invoke('hset',arguments,'write');
    },
    hmset:function(key,value,callback){
      this._invoke('hmset',arguments,'write');
    },
    del:function(key){
      this._invoke('del',arguments,'write');
    },
    hdel:function(key,filed){
      this._invoke('hdel',arguments,'write');
    },
    expire:function(key,ttl){
      this._invoke('expire',arguments,'write');
    },
    rename:function(oldName,newName,callback){
      this._invoke('rename',arguments,'write');
    },
    _invoke:function(method,args,type){
      var callback=args[args.length-1];
      if(typeof callback!=='function')
        callback=function(){};
      var client = Client.instance(type);
      this.redis = client; //redis client instance
      if(client&&!client.error){
        client[method].apply(client,args);
      }else{
        callback({msg:'redis-error'},null);
      }
    },
    redis:{},
    appCache:appCache
  }));
};
