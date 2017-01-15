/**
 * process_url  大写转换为小写 url
 * middleware for process_url
 *
 * */
var uri = require('url');

module.exports = function (util) {
  return async function process_url(ctx, next) {
    let req = ctx.request,
        res = ctx.response;

    //===== api don't need to be transformed
    if(/^\/api\/.*/.test(req.path) || req.is_assets){
      return await next();
    }

    //===== 大写url 统一转换为 小写，兼容大小写拼写错误
    if (/[A-Z]/.test(req.path)) {
      var lowerUrl = uri.format({
        pathname: req.path.toLowerCase(),
        query: req.query
      });
      return res.redirect(301, lowerUrl);
    }

    await next();//触发下一个任务
  }
}
