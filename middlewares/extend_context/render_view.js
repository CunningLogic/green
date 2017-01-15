/**
 *  render view
 *
 *  for bind_helper
 */

module.exports = function(ctx, util){
  return function render_view(view, locals) {
    var req = ctx.request,
        Helper = ctx.helper;
    var view_file = `${app.viewPath}/${view.replace('.jade', '')}.jade`,
        locale = req.locale_key;

    return new Promise((resolve, reject) => {
      //======调用翻译并生成静态文件
      RenderHelper.translate_render(ctx, {
        view: view,
        view_file: view_file,
        Helper: Helper,
        locale: locale,
        data: locals
      }, function (err, html) {
        if(err) return reject(err);

        ctx.status = 200;
        ctx.body = html; //输出 html, => response
        resolve(html); // => resolve promise state

        //==== 执行静态化过程, 并进行 redis 缓存
        try {
          if (locals.cache !== 'no') {//if cache=no ,not cache
            RenderHelper.cache_page(req.cache_key, html, ctx);
          }
        } catch (ex) {
          Monitor.error('cache or static error------> ');
          throw err; //throw to upstream
        }
      });// end render
    });
  };
}

var RenderHelper = {
  //===== 先进行多语言翻译，并渲染出 html page
  translate_render: async function (ctx, params, callback) {
    var req = ctx.request,
        Helper = params.Helper,
        API = ctx.API,
        locals = {}, //locals varible
        data = params.data;

    locals = _.merge({}, data, Helper);
    locals.view_file = params.view_file;
    locals.req = req; //set req params to locals

    //====== 多语言翻译
    var rest = await (function () {
      return new Promise((resolve, rejected) => {
        API.I18n.translate({view: params.view, data: locals}, function(err, rest){
          return err? rejected(err) : resolve(rest);
        });
      });
    })().catch(function(err){
      Monitor.error('I18n translate in middlware error------> ');
      callback(err, {}); //send err to callback
      throw err; //throw to upstream
    });

    var html = rest.data; //render html
    if(rest && rest.translated){
      html = req.render(locals);
    }

    return callback(null, html || '500');
  },
  //======= 静态化页面并缓存（静态）
  cache_page: function (key, html, ctx, from) {
    var cache_key = key,
        static_key = cache_key,
        THREE_DAY = 3 * 24 * 60 * 60,
        ONE_WEEK = 7 * 24 * 60 * 60,
        API = ctx.API,
        req = ctx.request,
        country = req.countryUp;

    //====== update no 代表 preview，不更新缓存，也不重新静态化，以保持应用的稳定性
    if (settings['page_cache'] && !req.update_no) {
      if (from == 'v1' || settings.env != 'production') {
        //======= 从旧官网拉取的页面直接缓存
        Cache.set(cache_key, html);
        Cache.expire(cache_key, THREE_DAY);
      } else {
        //======= 将html进行 ssi 分割后缓存
        API.Builder.ssi({
          html: html,
          cache: function (key, value) {
            var ssi_cache_key = `${key}_${country}`;
            Cache.set(ssi_cache_key, value);
            Cache.expire(ssi_cache_key, ONE_WEEK);
          },
          locale: req.locale_key || req.locale,
          device: req.device
        }, function (err, rest) {
          Cache.set(cache_key, rest.html);
          Cache.expire(cache_key, THREE_DAY);
        });
      }
    }
  }
}
