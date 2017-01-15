/**
 * sub_domain 处理子域跳转
 * middleware for sub_domain
 *
 * 如果 要进行subdomain 跳转，除了在这里添加列表外
 * 还需要到 nginx 层面添加到 proxy_pass 列表, 将subdoamin 代理到 www
 * */

module.exports = function (util) {
  return async function sub_domain(ctx, next) {
    let req = ctx.request,
        res = ctx.response;
    if(req.is_assets || req.method === 'POST' || /^\/api/g.test(req.url)){
      return await next(); // 资源、api或post请求 不需要经过此中间件
    }

    //====== responsibility.dji.com/path => www.dji.ocm/responsibility/path
    let subDomainList = [
      'responsibility',
      'enterprise'
    ];
    let availableLanguages = {
      responsibility: ['en', 'cn'],
      enterprise: ['en', 'cn', 'ja', 'jp']
    };

    let domain = req.cookie_domain;
    let cookie_options = { maxAge: '2592000000' , path: '/' , domain: domain};
    let host_domain = req.host.split('.')[0];
    let subDomain = subDomainList.indexOf(host_domain) > -1 ? host_domain : null;

    //====== 如果不是支持的 subdomain, 则不做处理
    if(!subDomain){
      return await next();
    }

    //===== 如果出现 子站点，不支持的语言，则跳转到英文首页
    if (availableLanguages[subDomain].indexOf(req.lang) === -1) {
      ctx.cookies.set('lang', 'en', cookie_options);
      return res.redirect('/');
    }

    // req.url 是否已经经过 url处理
    // eq: /\/enterprise(\/|$)/.test => www.dji.com/enterprise/path | www.dji.com/enterprise
    let alreadyTransformed = _.some(subDomainList, function(domain) {
      let reg = new RegExp(`/(${subDomainList.join('|')})(\/|$)`) ;
      return reg.test(req.url);
    });

    if (alreadyTransformed) {
      return await next();
    } else {
      req.url = '/' + subDomain + (req.url == '/' ? '' : req.url);
      req.origin_url = req.path_lang + (req.use_mobile ? '/mobile' : '' ) + req.url;
      console.log('-----modify req.url for special domain ----');
      console.log('req.url----->'+req.url);
      console.log('req.origin_url----->'+req.origin_url);
      return await next();
    };
  }
}
