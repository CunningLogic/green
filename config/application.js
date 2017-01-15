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
    staging: {
      qbox:['dn-beta','dn-beta1','dn-beta2','dn-beta3'],
      s3:['s3.amazonaws.com/dbeta-me'],
      host:function(path,host){
        var cdn = settings['cdn'],
            key = host||'qbox';
        return cdn.modulo(this[key],path) + (key==='s3'? '':cdn.domain.get(key));
      }
    },
    production: {
      //智能CDN，由IP来决定使用 cloudfront 或 qbox
      smart:['www1.djicdn','www2.djicdn','www3.djicdn','www4.djicdn','www5.djicdn'],
      s3:['www1.djicdn'],
      host:function(path,host){
        var cdn = settings['cdn'],
            key = host||'smart';
        return cdn.modulo(this[key]||this['smart'],path) + cdn.domain.get(key);
      }
    },
    domain:{
      cloud:'.cloudfront.net',
      qbox:'.qbox.me',
      smart: '.com',
      get:function(key){
        return this[key]||this['smart'];
      }
    },
    modulo:function(list,path){
      var total = 0,
          size = list.length; // [0 - length]
      for(var i =0,len = path.length; i<len ; i++){
        total += path.charCodeAt(i);
      }
      return "//"+list[total%size];
    }
  },
  api:{
    query:{
      method:'get',
      url:"/api/official/query"
    },
    dji_lang:{
      method:'post',
      url:'http://translator.dji.com/api/translations'
    },
    user_center:{
      staging:{
        host:'http://54.204.7.54:9000'
      },
      production:{
        host:'http://54.227.246.14:9000'
      },
      host:'http://54.227.246.14:9000'
    },
    www_cms:{
      staging:{
        host:'http://www-cms.dbeta.me:90'
      },
      //production or development env
      host:'http://www-cms.dji.com'
    },
    store_cms:{
      development: {
        host:'http://store.djiplus.me:3000'
      },
      staging:{
        host:'http://store.dbeta.me'
      },
      //production or development env
      host:'http://store.dji.com'
    },
    repair:{
      method:'wsdl',
      url:'http://extra.gtdji.com:25041/dji-ddsService/services/DdsService?wsdl'
    }
  }
},_setting);

