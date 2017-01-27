/**
 * 页面缓存读取
 * middleware for read_cache
 * */

let api = require('../services/API');

module.exports = function (util) {
  return async function read_cache(ctx, next){
    //====so we can use it in request
    let req = ctx.request,
        API = api.bind(req);
    ctx.request.API = API; //bind API to context

    if (req.is_assets || settings.publish === 'preview') {
      return await next();// 资源不需要经过此中间件, 预览服务器也不使用缓存
    }

    //====== cache=update 更新数据以及页面缓存，cache＝no 重新获取数据，但不跟新页面缓存
    //====== req.update_cache 用于判断是否应当更新 数据缓存
    req.update_no = req.query['cache'] === "no";
    req.update_cache = (req.query['cache'] === 'update' || req.update_no);

    let has_pwd = ctx.cookies.get['www-cache'] === 'official' || req.query['www-cache'] === 'official';
    if (settings.publish !== 'production') {
      has_pwd = true;  //仅在线上环境检查 flag
    }
    if (settings.publish === 'production' && !has_pwd) {
      req.update_cache = false; //如果 是线上环境,只有cookie中带有指定参数的请求,才能使用 update
    }

    //====== 构建 缓存 key, cache_key 默认 =ssi:url
    let need_update = !settings['page_cache'] || req.update_cache,
        cache_key = `ssi:${req.origin_url}`;
    if(cache_key.has('?') && !req.query['page']){
      cache_key = cache_key.substring(0,cache_key.indexOf('?'));
    }
    req.cache_key = cache_key;

    //====== 如果需要更新或者不需缓存，则绕过缓存读取
    if (need_update) {
      return await next();
    }

    //====== 读取缓存，并响应
    let html = await new Promise((resolve) => {
      Cache.get(cache_key, function (err,cache) {
        if (err) console.log(err);
        if (!err && cache) {
          API.Builder.render_ssi({
            html: cache,
            getValue: function (key, cb) {
              let ssi_key = `${key}_${country}`;
              Cache.get(ssi_key, cb);
            }
          }, function (err, html) {
            resolve(html); //callback yield
          });
        } else {
          //=====如果页面缓存不存在，则更新所有缓存
          req.update_cache = true;
          resolve(); //callback yield
        }
      });
    });

    //=== 如果没有缓存，触发下一个任务
    if(!html) return await next();

    console.log('-----get page from cache----');
    console.log('url----->' + cache_key);

    //====== err page 必须返回 特定状态码，而非 200
    let err_page_reg = new RegExp('(404|500|502)','g');
    if (err_page_reg.test(req.url)) {
      ctx.status = RegExp.$1;
      ctx.body = html;
    } else {
      ctx.body = html;
    }
  }
}
