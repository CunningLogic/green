/**
 * is_mobile 设备判断
 * middleware for is_mobile
 *
 * 1，判断当前设备信息， media info
 * 2，输出当前请求相关的详细信息 request info
 * 3，不同设备间的链接跳转  redirect
 *
 * */
var MobileDetect = require('mobile-detect');

module.exports = function (util) {
  return async function is_mobile(ctx, next) {
    var req = ctx.request,
        res = ctx.response,
        cookie = ctx.cookies;

    if(req.is_assets){
      return await next(); // 资源不需要经过此中间件
    }

    var userAgent = req.headers['user-agent'] || '';
    var media = new MobileDetect(req.headers['user-agent']);

    //===== 设备判断不可直接用于浏览器环境，如需，请使用 components/base/device
    //todo: 如果要使用，需要更改缓存结构，加上 device 字段
    req.is_mobile = media.mobile()&&!media.tablet();
    req.is_weixin = media.match('MicroMessenger');
    req.is_iphone = media.is("iPhone");
    req.media = media;
    req.x_protocol = req.headers['x-forwarded-proto'] || req.protocol;

    //===== 如果cookie或者查询参数中包含设定字段，强制使用 mobile 视图
    if (cookie.get('from') === 'mobile' || req.query['from'] === 'mobile') {
      req.is_mobile = true;
    }
    //===== 如果是移动设备，且环境允许
    req.use_mobile = req.is_mobile;
    //=== 如果存在，此cookie，则认为是由手机版，切换到pc版，不做跳转处理
    if(cookie.get('www_visit_pc')){
      req.use_mobile = false;
      req.visit_pc = true;
    }
    req.device = req.use_mobile ? 'mobile' : 'pc';
    //=== dds 等特殊app，需通过 userAgent 中的特殊标示判断
    if(userAgent.has('##DDS@DJI##')) req.device = 'dds';

    if(!req.is_assets){
      Monitor.green('request time---------> ' + ctx.timestap);
      Monitor.green('-----------request agent--------------');
      Monitor.green(req.headers['user-agent']);
      Monitor.green(`---->ip-from:${req.ip_from||req.ip}; locale:${req.locale}; country:${req.country||"unknown"}; protocol:${req.x_protocol}`);
      Monitor.green(`---->mobile:${media.mobile()}; os:${media.os()}; agent:${media.userAgent()}; weixin:${req.is_weixin}`);
      Monitor.green('-------------------------------------');
    }

    var www_from = cookie.get('www_from'),
        cookie_opt = { maxAge: '2592000000' , path: '/' , domain: req.cookie_domain};
    //======= 如果是移动设备，则跳转到移动设备的链接上
    if(req.use_mobile && !/^\/mobile/g.test(req.url) && req.method.toUpperCase() != 'POST'){
      if(www_from !== 'mobile'){
        cookie.set('www_from', 'mobile', cookie_opt);
      }

      var path_lang = req.path_lang; // '' || req.lang
      var redirect_m_url = (path_lang + '/mobile' + req.url).replace(/\/$/, '');
      return res.redirect(redirect_m_url);
    }else{
      //======= 如果不是mobile， 但路径中带了 mobile, 就跳转 ( cache＝update 操作除外 )
      var is_redirect = !req.use_mobile && /^\/mobile/g.test(req.url) && !req.query['cache'];

      req.url = req.url.replace(/^(\/mobile)|(\/dds)/g,'');
      if(req.url[0] !== '/') req.url = '/' + req.url;

      if(!req.use_mobile && www_from !== 'pc'){
        cookie.set('www_from', 'pc', cookie_opt);
      }
      if(is_redirect){
        var redirect_url = req.originalUrl.replace(/(\/mobile)|(\/dds)/g,'');
        return res.redirect(redirect_url);
      }
    }

    return await next(); // to next
  }
}
