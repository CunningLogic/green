var crypto = require('crypto');
var http = require('request');
var fs = require('fs');
var path = require('path');
var async = require('async');
var _ = require('lodash');

var _config = {};
var config = function (options) {
  _config = _.assign({
    url: '',//翻译中心地址
    token: '',//翻译中心 token key
    app: "dji_official"
  }, options);
};

function I18n(req, options) {
  this.locale = req.locale;
  this.reference = req.url || 'http://www.dji.com';
  _.assign(this, {
    //====Cache 对象需要重载,必须包含set,get方法
    //====通常对应 redis 缓存
    Cache: {
      set: function (key, value) {
        I18n._cache[key] = value;
      },
      get: function (key, callback) {
        return callback(null, ctx._cache[key]);
      }
    },
    helper: {
      t: function () {},
      set: function () {},
      get: function () {},
      words: {}
    },
    //====== 单个,获取词条翻译
    get_item: function (key, option, callback) {
      if (typeof option === 'undefined') option = {};
      if (typeof option === 'function') callback = option;
      if (typeof callback === 'undefined') callback = function () {};

      var params = {
        key: key,
        text: key,//key 对应的英文文本
        app_id: this.app,
        version: '',
        locale: option.locale,
        reference_url: I18n.reference
      };
      var ctx = this;

      this.Util.query('get_item', params, function (err, res) {
        if (err) console.error(err);
        ctx.helper.set(key, res, params.locale);
        callback(err, res);
      });
    },
    //====== 批量,获取词条翻译
    get_by_once: function (keys, option, callback) {
      if (typeof option === 'undefined') option = {};
      if (typeof option === 'function') callback = option;
      if (typeof callback === 'undefined') callback = function () {
      };

      var ctx = this,
          keys_text = keys.join(' '),
          locale = ctx.locale;
      var params = {
        key: keys_text,
        text: keys_text,//key 对应的英文文本
        app_id: ctx.app,
        version: '',
        locale: option.locale,
        by_once: true,
        reference_url: I18n.reference
      };

      ctx.Util.query('get_items', params, function (err, trans, extra) {
        var rest = {},
            not_found = {},
            not_trans = [],
            trans_task = [],
            trans_count = 0,
            data = trans.data;
        if (trans.status == 1) {
          keys.forEach(function (k) {
            not_found[k] = false;
          });
        }

        for (var k in data) {
          if (data.hasOwnProperty(k)) {
            var text_obj = data[k];
            k = k.toLowerCase();

            if (typeof text_obj === 'string') {
              not_found[k] = false;
              continue;
            }//not found item

            var text = text_obj[locale],
                locale_key = locale + "_" + k;
            trans_count++; //记录翻译调用次数
            ctx.helper.set(k, text, locale, text_obj);
            if (ctx.helper.words[locale_key] !== false) {
              rest[k] = text;//返回当前locale的数据
              ctx.Cache.set(locale_key, text);
            } else {
              console.log('not-trans------>' + k + ":" + text);

              //========如果翻译不成功，最后一次将使用逐条翻译的查询方式
              if (ctx.re_translate) {
                (function (key, _locale_key) {
                  trans_task.push(function (cb) {
                    ctx.get_item(key, {locale: locale}, function (err2, text) {
                      ctx.helper.set(key, text, locale);
                      ctx.Cache.set(_locale_key, text);
                      cb(err2, {key: key, text: text, flag: 'get'});
                    });
                  });
                })(k, locale_key);
              }
              not_trans.push(locale_key);
            }
          }//end if
        }//end for

        console.log('----new translate(' + locale + ')----');
        console.log(ctx.helper.words);
        console.log('----not found translate----');
        console.log(not_found);
        console.log('not_translate: -------->' + not_trans.length);

        //======执行逐条翻译任务
        if (trans_task.length > 0) {
          async.parallelLimit(trans_task, 10, function (err, list) {
            console.log('----translate by get_item----');
            if (err) console.log(err);
            console.log(list);
            console.log(I18n.helper.words);
          });
        }

        //======如果存在未翻译词条，重新查询
        if (not_trans.length > 0 && !ctx.re_translate) {
          console.log('----translate err info----');
          console.log(extra.err);
          console.log(extra.res.code);
          console.log(trans);

          var timer = setTimeout(function () {
            ctx.re_translate = true;
            ctx.get_by_once(keys, option, callback);
            clearTimeout(timer);
          }, 1000);
        } else {
          callback(err, rest);
        }
      });
    },
    //=====by_once 参数指定，一次性获取全部的 key 值后返回
    collection: function (params, callback, by_once) {
      var ctx = this,
          locale = params.locale,
          update_cache = params.update_cache || false,
          key_list = params.keys;

      var trans_task = key_list.map(function (key) {
        return function (cb) {
          (function (key) {
            var data = ctx.helper.t(key),
                text = data.data || data,
                locale_key = locale + "_" + key;

            if (text == key || update_cache) {
              ctx.Cache.get(locale_key, function (err, cache) {
                if (cache && !err && !update_cache && cache != key) {
                  ctx.helper.set(key, cache);
                  cb(err, {key: key, text: cache, flag: 'cache'});
                } else {
                  if (by_once) {
                    return cb(null, {key: key, flag: 'by_once'});
                  }
                  ctx.get_item(key, {locale: locale}, function (err2, text) {
                    ctx.helper.set(key, text);
                    ctx.Cache.set(locale_key, text);
                    cb(err2, {key: key, text: text, flag: 'get'});
                  });
                }
              });
            } else {
              cb(null, {key: key, text: text});
            }
          })(key);
        };
      });

      //====执行指定的任务序列
      async.parallelLimit(trans_task, 10, function (err, list) {
        if (!err) {
          var req_keys = [],
              cache_keys = {};

          list.forEach(function (item) {
            if (item.flag == 'by_once') req_keys.push(item.key);
            else {
              cache_keys[item.key] = item.text;
            }
          });

          if (req_keys.length == 0) {
            return callback(err, cache_keys);
          }
          else {
            ctx.get_by_once(req_keys, {locale: locale}, function (err, data) {
              if (err) {
                console.error('----translate error-----');
                console.log(err);
              }
              return callback(err, data);
            });
          }
        } else {
          console.error('----translate error-----');
          console.error(err);
          callback(err, null);
        }
      });
    },
    //=====返回keys用于翻译
    generate: function (callback) {
      console.log('translate error--------->请重载 generate方法');
      callback(null, [], '');
    },
    //=====主入口函数
    translate: function (params, callback) {
      var self = this,
          locale = req.locale_key || req.locale || 'en',
          update = params.update_cache;
      self.locale = params.locale || locale;
      self.reference = req.url || 'http://www.dji.com';

      //console.log('###########');
      //console.log(req.locale);
      //console.log(req.origin_url);
      self.generate(params, function (err, key_list, html) {
        if (err) {
          return callback(err, null, null);
        }
        if(!key_list || key_list.length === 0 || settings.i18n === false){
          return callback(null, {translated: false, data: html});
        }
        self.collection({keys: key_list, locale: locale, update_cache: update}, function (err, data) {
          return callback(err, {translated: true, data: data});
        }, true);
      });
    }
  }, _config, options);
}

I18n.prototype.Util = {
  keygen: function (options) {
    var key = _config.token || '';
    var locale_str = options["by_once"] ? "" : "#{locale}";
    var hmac = crypto.createHmac('sha1', key);
    var str_tpl = "#{app_id}\n#{text}\n" + locale_str + "\n#{version}\n";
    delete options["by_once"];

    hmac.update(helper.render(str_tpl, options));
    return hmac.digest('base64');
  },
  query: function (method, params, callback) {
    var by_once = params.by_once;
    var key = this.keygen(params),
        auth = "djilang " + params.app_id + ":" + key;

    http.post({
      url: _config.url + "/" + method,
      timeout: 30 * 1000,
      form: params,
      headers: {
        'Authorization': auth
      }
    }, function (err, res, body) {
      if (err) {
        return callback(err, '');
      }
      var rest = {},
          data = {};//translate data
      try {
        rest = JSON.parse(body) || {};
        if(!rest.data){
          Monitor.error(rest);
        }
        data = rest.data || {};
      } catch (e) {
        Monitor.error(e);
      }

      if (by_once) {
        callback(null, rest, {err: err, res: res});
      }
      else {
        callback(null, data.value || '');
      }
    });
  }
};


module.exports = I18n;
module.exports.config = config;
