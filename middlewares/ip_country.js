/**
 * ip_contry 国家定位
 * middleware for ip_contry
 *
 * 1, 根据IP 获取国家信息  ip => country
 * 2，根据国家，语言，cookie 确定是否进行语言重定向  country => lang redirect
 * */
var uri = require('url');
var geoip = require('geoip-lite');

module.exports = function (util) {
  return async function ip_country(ctx, next) {
    let req = ctx.request,
        res = ctx.response;

    //资源不需要经过此中间件
    if (req.is_assets) {
      return await next();
    }

    let helper = ctx.helper,
        cookie = ctx.cookies,
        path = req.path;

    //====== 根据 host 获取 cookie domain, 不包含子域
    req.cookie_domain = ".dji.com";
    let parts = req.hostname.split('.'); // www.dji.com => ['www','dji','com'], 10.0.12.185 => ['10','0'...]
    if (parts.length > 2 && isNaN(Number(parts[0]))) {
      parts[0] = ''; //ip(eq: 10.0.12.185) 访问，不进行置空操作
    }
    req.cookie_domain = parts.join('.');

    //====== 从请求中获取 ip 并色着相关变量
    req.ip_from = (req.headers['x-forwarded-for'] || '').split(',')[0] || ctx.req.connection.remoteAddress || req.ip;
    req.geo_country = req.cookies['www_country'] || "unknown"; // 默认country，从cookie里取出

    //====== 本机IP地址,需在前端 console 出来
    req.local_ip = settings.local_ip;
    ctx.res.setHeader('local_ip', req.local_ip);


    /* 如果 url 中的 locale 和当前国家不符合, 则需要跳转到该国家的语言
     * 另外需排除非 get 请求, ajax 请求, 以及部分不需要跳转的路径
     */
    let valid_paths = [/.*api.*/];
    let can_pass = ctx.method !== 'GET'
      || ctx.get("x-requested-with") === "XMLHttpRequest"
      || _.some(valid_paths, path_reg => path_reg.test(path));

    let is_need_check = !req.query["clear_lang_cookie"] && !req.query['cache'] && !can_pass;

    if(is_need_check){
      console.log('lookup geo ip ------->>' + req.url);

      var domain = req.cookie_domain;
      var cookie_lang = cookie.get('www_lang');
      var cookie_options = { maxAge: '2592000000' , path: '/' , domain: domain};

      //====== 没有www_lang 则根据ip进行重定向, cookie has www_lang ?
      if (_.isEmpty(cookie_lang) ){
        var ip = req.ip_from;
        var geo = geoip.lookup(ip) || {};
        req.geo_country = geo.country;
        cookie.set('www_country', geo.country ||' unknown', cookie_options );

        //=== 根据国家语言映射表，得到语言 country => lang
        var map = {
          'CN' : 'cn',
          'TW' : 'zh-tw',
          'HK' : 'zh-tw',
          'MO' : 'zh-tw',
          'JP' : 'jp',
          'KR' : 'kr',
          'DE' : 'de',
          'US' : 'en',
          'FR' : 'fr',
          'ES' : 'es',
          'MX' : 'es',  // 墨西哥 : 西班牙
          'AE' : 'en'   // 阿联酋 : 英语
        };
        var current_lang = req.lang,
            country_lang = map[geo.country] || 'en',// get from map
            path_lang = country_lang == 'en'? '': country_lang; //en => ''

        console.log('#####', country_lang, req.geo_country , cookie_options);

        //=== geo 不为空 并且 contry_lang not empty 并且 != current_lang
        //=== 则进行 重定向操作
        let is_need_redirect = !_.isEmpty(geo) && country_lang && country_lang != current_lang;
        if(is_need_redirect){
          var req_path = req.path == '/' ? '' : req.path,// '/' => '', '/**' => '/lang/**'
              redirect_path = `/${path_lang}${req_path}`;

          var redirect_url = uri.format({
            pathname: redirect_path,
            query: req.query //need query params
          });
          return res.redirect(redirect_url);
        }

        cookie.set('www_lang', country_lang, cookie_options);
      }
    }

    return await next(); //to next middleware
  }
}
