/**
 *
 * application settings
 * it's init when app bootstrap
 *
 * you can visit by settings object in any where
 * like : settings.remote.env
 *
 * 如果 application 有更新会更新到这里，
 * 但要注意本地的环境配置，不要被覆盖
 *
 */
var _ = require('lodash');
var _setting = require('./_application.js')._application;

module.exports.application = _.assign({
  i18n: false,
  update_by:'cache=update',
  db_path: '/data/jsondb',
  cdn:{
    staging: {
      qbox:['cdn'],
      s3:['cdn'],
      host:function (path, host) {
        var cdn = settings['cdn'],
            key = host || 'qbox';
        return cdn.modulo(this[key], path) + (key === 's3' ? '' : cdn.domain.get(key));
      }
    },
    production: {
      //智能CDN，由IP来决定使用 cloudfront 或 qbox
      smart:['cdn'],
      s3:['cdn'],
      host:function (path, host) {
        var cdn = settings['cdn'],
            key = host || 'smart';
        return cdn.modulo(this[key] || this['smart'], path) + cdn.domain.get(key);
      }
    },
    domain:{
      cloud:'.cloudfront.net',
      qbox: '.15ba.cn',
      smart: '.15ba.cn',
      get:function (key) {
        return this[key] || this['smart'];
      }
    },
    modulo:function (list, path) {
      var total = 0,
          size = list.length; // [0 - length]
      for(var i = 0, len = path.length; i < len; i++) {
        total += path.charCodeAt(i);
      }
      return "//" + list[total % size];
    }
  },
  api:{
    dji_lang:{
      method:'**',
      url:"***"
    }
  }
}, _setting);

