/**
 * 页面缓存读取
 * middleware for read_cache
 * */
//var co = require('co');
var fs = require('fs');
var path = require('path');

var render_view_helper = require('./render_view');
var translator_helper = require('./translator');
var redirect_helper = require('./redirect');

module.exports = function (util) {
  return async function extend_context(ctx, next) {
    var req = ctx.request,
        res = ctx.response,
        API = req.API;

    if (req.is_assets) {
      return await next();// 资源不需要经过此中间件, 预览服务器也不使用缓存
    }

    req.locals = {}; //partial local variable
    req.page_meta = {}; //清空当前页面的meta
    req.product = {}; //clear product
    req.set_page('');//清空当前页面的值

    //======= 扩展 API 接口，方法
    ctx.API = Object.assign(API, {
      I18n: translator_helper(ctx, util)
    });

    //======= 扩展 ctx 对象
    Object.assign(ctx, {
      render_view: render_view_helper(ctx, util)
    });

    //======= 扩展 res 对象
    Object.assign(res, redirect_helper(ctx, util));

    await next(); //执行下一个中间件
  }
}


