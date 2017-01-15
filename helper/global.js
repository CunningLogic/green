/**
 * ⚠ 注意
 *
 * 如果模块内部依赖 req 对象，不要使用 helper 来调用方法
 * 而使用 req.method() or req.attr 来调用
 * helper 仅用于调用独立的，不依赖 req 对象的属性或者方法
 * 否则会产生不可预期的变量覆盖
 *
 */


var _= require('lodash');

var i18n=require('./_i18n');
var url=require('./_url');
var util=require('./_util');
var product_helper=require('./_product.js');
var newsroom=require('./_newsroom.js');
var meta=require('./_meta.js');
var stats=require('./_stats.js');
var error=require('./_err.js');

global.helper= _.assign({
  _I18n:{
    words:{}
  },
  cache:{}
},util);

module.exports={
  helper:global.helper,
  bind:function(req){
    var modules=[i18n,url,util,product_helper,newsroom,meta,stats,error],
        merged={};
    modules.forEach(function(mod){
      var res=mod;
      if(typeof mod==='function'){
        res=mod(req);
      }
      merged= _.assign(merged,res);
    });
    //======调用方式，请参考顶部注释
    global.helper=_.assign(global.helper,merged);

    req.helper={};
    for(var k in merged){
      if(req[k]) req.helper[k]=merged[k];
      else {
        req[k]=req.helper[k]=merged[k];
      }
    }
    return req;
  }
};


