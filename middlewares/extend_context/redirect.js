/**
 * redirect
 *
 * for bind_helper
 */

module.exports = function(ctx, util){
  let req = ctx.request,
      res = ctx.response,
      API = req.API;

  return {
    redirect_v1: function (from = 'http') {
      if (ctx && !ctx.is_redirect) {
        ctx.is_redirect = true;

        var protocol = req.x_protocol;  //protocol by x-forwarded-proto
        var origin = settings.remote[settings.env].origin.replace('http', protocol),
            url = req.origin_url || req.url,
            redirect_url = origin + url.replace(/(\?|&)?www=v1/g, '');
        redirect_url += redirect_url.has('?') ? "&www=v1" : '?www=v1';

        if (redirect_url.has('change_country')) {
          redirect_url += ("&referer=" + (req.header["referer"] || (origin + "/user")));
        }
        redirect_url = redirect_url.replace('mobile/', '');

        //======= 抓取并缓存产品页面
        //if (this.is_page('product') || this.is_page('products')) {
        //  console.log("[:" + from + '] fetch and cache to------->');
        //  console.log(redirect_url);
        //
        //  API.request('get', redirect_url, {
        //    cache_key: req.url
        //  }, function (err, resp) {
        //    resp = resp || {};
        //    var html = resp.data || resp;
        //    if (err || resp.status != 200 || html.has('<h1>404</h1>')) {
        //      return res.redirect_404(req.url);
        //    }
        //
        //    res.send(200, html);
        //    HttpHelper.static_and_cache(req.cache_key, html, req, 'v1');
        //    req = res = null;
        //  }, 'string');
        //} else {
        //======== 除产品外的,404链接,都跳转到旧官网
        console.log("[:" + from + '] redirect to------->');
        console.log(redirect_url);

        res.redirect(redirect_url);//302
      }
    },
    redirect_https: function (path) {
      if (!req || !res) return;
      var protocol = ctx.request.x_protocol;
      var from = path || req.url.replace(/^\//, '');

      if (protocol == "http" && settings.publish) {//settings.env
        return context.helper.url(from, 'https');
      }
      return false;
    },
    redirect_err: function (from_url, status) {
      if (!req || !res) return;
      var from = req.origin_url.replace(/^\//, '');
      if (from.has('?')) {
        from = from.substring(0, from.indexOf('?'))
      }
      status = status ? status : '404';
      res.redirect('/' + status + '?from=' + (from_url || from));
      req = res = null;
    },
    redirect_301: function (redirect_url) {
      ctx.status = 301; //301 redirect
      res.redirect(redirect_url);
    },
    redirect_404: function (from_url) {
      res.redirect_err(from_url, 404);
    },
    redirect_500: function (from_url) {
      res.redirect_err(from_url, 500);
    },
    redirect_502: function (from_url) {
      res.redirect_err(from_url, 502);
    },
    success: function(status, data, extra){
      ctx.status = 200;
      ctx.body = API.result(true, status, data, extra);
    },
    failure: function(status, data, extra){
      ctx.status = 200;
      ctx.body = API.result(false, status, data, extra);
    }
  };
}
