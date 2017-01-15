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
  update_by:'cache=update',
  db_path: '/data/jsondb',
  cdn:{

  },
  api:{
    dji_lang:{
      method:'**',
      url:"***"
    }
  }
}, _setting);

