/**
 * static_assets 静态资源处理
 *
 * middleware for static_assets
 * */
let convert = require('koa-convert');
let assets = require('koa-static');

module.exports = function (util) {
  return async function static_assets(ctx, next){
    let req = ctx.request;

    if(!ctx.request.is_assets) {
      console.log('>>>>>', req.url);

      await next();
    }else {

      req.url = req.url.replace('/mobile', '');

      return convert(assets('.tmp/public', {defer: false}))(ctx, function(){
        Monitor.error('assets not found, ' + req.url);

        ctx.status = 404; //no assets
        return new Promise(function(resolve){
          return resolve(); //end request
        });
      });
    }
  }
};
