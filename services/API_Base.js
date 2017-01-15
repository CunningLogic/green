/***
 * api.base
 * we will defined common method at here
 *
 * */
var crypto = require('crypto');
var http = require('http-request');
var querystring = require('querystring');
var request = require('request');
var agent = require('superagent');

var _ = require('lodash');

module.exports = function (req) {
  var base = {
    hmacWithBase64: function(key,sign_str){
      return base.hmac(key,sign_str,'base64');
    },
    hmac: function(key, sign_str, type, secret){
      var hmac = crypto.createHmac(secret||'sha1', key);
      hmac.update(sign_str, 'utf8');
      return hmac.digest(type||'base64').replace(/\+/g, ' ');
    },
    getAPIHost:function(name,attr,_env){
      var k = attr||'host',
          env = _env||settings.remote_env,
          env_host = settings.api[name][env];
      return env_host ? env_host[k] : settings.api[name][k];
    },
    decode: function (param) {
      var  p = _.assign({},param);
      for (var k in p) {
        try{
          if(typeof p[k] !== 'object')
            p[k] = decodeURIComponent(p[k]);
        }catch(e){
          console.log("Decode error: "+k);
        }
      }
      return p;
    },
    readCache: function(cache_key,args,callback){
      cache_key = settings.remote_env + "["+req.locale_key+"]" +cache_key;

      Cache.get(cache_key ,function(err,cache){
        if(!req.update_cache && cache && !err){
          Monitor.green('fetch data from cache by key ------->' + cache_key);
          return callback(null, JSON.parse(cache));
        }else{
          Monitor.green('fetch data from remote set key ------->' + cache_key);
          //====删除缓存字段，并重新请求
          var cb = function(err,rest){
            if(!err && rest.status==200){
               Cache.set(cache_key,JSON.stringify(rest));
            }
            callback(err,rest);
          };
          if((args[2]||{}).cache_key){
            delete args[2].cache_key;
          }
          args[3] = cb; //重载回调
          base.request.apply(base,args);
        }
      });
    },
    request: function (type, url, param, callback, respType) {
      return new Promise((resolve, reject) => {
        base.request_base(type, url, param, function(err, rest){
          if(_.isFunction(callback)){
            callback(err, rest);
          }
          return err? reject(err): resolve(rest);
        }, respType);
      });
    },
    request_base: function (type, url, param, callback,respType) {
      var config = param.config||{
        url: encodeURI(url),
        timeout: 30 * 1000,
        headers: _.assign({
          'user-agent':'dji_official/v2.0.0  node.js/v0.12.4'
        },(param.headers || req.headers))
      };
      if(param.cache_key){
        // 如果遇到缓存设置，则首先读取缓存，
        // 如果读取缓存失败，则由缓存模块重新调用request
        return base.readCache(param.cache_key ,arguments,callback);
      }

      if(param.config) { delete param.config; }
      if(!param['no_ip']){
        param.ip = req.ip_from || req.ip;
      }else{
        delete param['no_ip'];
      }

      type = type || 'get';
      Monitor.green(type + "------>" + url);

      //===== delete params
      if("_csrf" in param){ delete param['_csrf']; }
      if("www-cache" in param){ delete param['www-cache']; }
      if(type == 'get' && ('headers' in param)) { delete param.headers; }

      var reqBody = querystring.stringify(base.decode(param));

      if (type == 'post') {
         Monitor.green("params------>" + reqBody);
         config.reqBody = new Buffer(reqBody);
      } else if (type == 'get' && reqBody) {
         Monitor.green("params------>" + reqBody);
         config.url += (config.url.has('?') ? "&" : '?') + reqBody;
      } else if(type == 'post-form'){
         Monitor.green("params------>" );
         console.log(param);
         return base.post_form(url,param,callback);
      } else if(type == 'post-json'){
         Monitor.green("params------>" );
         console.log(param);
         return base.post_json(url,param,callback);
      }

      //=======如果不是 post-form 请求
      console.log(config);
      http[type](config, function (err, rest) {
        if (err) {
          if(err.document){
            if(err.document.data && err.document.type == 'Buffer'){
              err.document.data = new Buffer(err.document.data).toString();
            }
          }
          if(typeof err === 'object') {
            err.from = "http " + type + " error: " + err.toString();
          }

          var ignore = {404: true, 301: true, 302: true};
          if(!(err.code in ignore)){
            var priority = err.code >= 500 ? 3 : 5; //发生 500 错误时，需发送邮件
            if(url.indexOf('api/monitor') > -1){ //如果是 monitor 接口 自身发生了错误，不要发送请求，避免循环
              Monitor.error('http get error------->>');
            }else{
              Monitor.error('http get error------->>', {type: 'api', priority: priority, url: url, stack: err });
            }
          }
          console.log(err);//show error

          return callback(err, {});
        }

        var res = rest.buffer.toString(),
            data = {};//translate data

        try {
          if(!respType || respType == 'json'){
            data = JSON.parse(res) || {};
            if(data && !data.status) data.status = '200';

            Monitor.green('status-------->' + data.status || rest.code);
          }else{
            data.data = res;
            data.type = respType;
          }
        } catch (e) {
          var stack = "http " + type + " exception: " + e;
          Monitor.error('Exception-------->', {type: 'api', url: url, stack: stack});
          console.error(e);
        }

        data.status = data.status || rest.code;
        callback(null, data);
      });
    },
    post_json:function(url,param,callback){
      var headers = param.headers;
      if(param.headers) delete param.headers;

       agent.post(url).send(param)
            .end(function(err, rest){
               var data = rest&&rest.body;
                if (err) {
                  var priority = err.status >= 500 ? 3 : 5; //发生 500 错误时，需发送邮件

                  if(typeof err === 'object') err.from = "post_json error: ";
                  Monitor.error(err, {type: 'api', priority: priority, url: url, stack: err});
                  return callback(err, {});
                }
                Monitor.green('request result-------->');
                console.log(data);
                return callback(err,data||{});
            });
    },
    post_form:function(url,param,callback){
      var headers = param.headers;
      if(param.headers) delete param.headers;
      return request.post({
        url:url ,
        headers:headers,
        formData:param
      },function(err,rest){
        var data = {};
        if (err) {
          if(typeof err === 'object') err.from = "post_form error: ";
          var priority = (err.status || err.code) >= 500 ? 3 : 5; //发生 500 错误时，需发送邮件

          Monitor.error('request error-------->', {type: 'api', priority: priority, url: url, stack: err});
          console.log(err);
          return callback(err, {});
        }
        try{
          data = JSON.parse(rest.body);
        }catch(e){
          var stack = {
            from: 'post_form exception',
            ex: e,
            body: rest.body
          };
          Monitor.error(rest.body, {type: 'api', url: url, stack: stack});
        }
        Monitor.green('request result-------->');
        console.log(data);
        return callback(err,data||{});
      });
    }
  };
  return base;
};
