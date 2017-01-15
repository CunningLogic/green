/**
 * 多语言
 * middleware for i18n_locale
 * */
let uri = require('url');
let helper = require('../helper/global');

module.exports = function (util) {
  return async function i18n_locale(ctx, next) {
    let req = helper.bind(ctx.request),//set helper methods to req
        res = ctx.response;
    req.cookies = ctx.cookies;
    req.query = ctx.query;
    ctx.helper = req.helper;

    //==== path => lang => locale
    let def = 'en', //default lang
        locales = ctx.helper.availableLocales,
        langs = ctx.helper.availableLanguages,
        path_parts = req.path.split('/'), // path: /cn/products => paths: ['','cn','products']
        lang_in_path = langs.indexOf(path_parts[1]) > -1 ? path_parts[1] : '', // path parts 1 is lang
        lang = lang_in_path || def, //lang in available ? lang : default
        locale = ctx.helper.langugaeToLocale[lang] || lang; //cn => zh-CN, en => en

    req.lang = lang; //lang in path
    req.path_lang = lang === 'en' ? '' : `/${lang}`;
    req.support_lang = langs;
    req.locale_key = req.locale = locale; //locale use in app

    //==== delete update cache flag : cache=update || no
    //==== origin_url 包含语言信息，便于跳转时使用
    delete req.query['cache'];
    req.origin_url = req.url = uri.format({
      pathname: req.path,
      query: req.query
    });

    //====== 去除路径中的语言信息，/cn/news -> /news
    let no_lang_path = (req.path + "/").replace(`/${lang}/`, "/");
    if (no_lang_path != '/') {
      no_lang_path = no_lang_path.replace(/\/$/g, '');
    }
    req.url = uri.format({
      pathname: no_lang_path,
      query: req.query
    });

    //====== 如果url末尾包含 ／ 则跳转到不包含反 ／ 的url
    if(req.path != '/' && /.*\/$/g.test(req.path)){
      Monitor.green('redirect_by -------->: ' + req.origin_url);
      ctx.status = 301; //301 redirect
      return res.redirect(uri.format({
               pathname: req.path.replace(/\/$/g,''),
               query: req.query
             })
      );
    }

    //=====根据匹配出的语言,跳转到指定路径
    let redirect_map = {en: '', ja: 'jp', ko: 'kr'};
    let match_to = redirect_map[lang_in_path];

    if (typeof match_to !== 'undefined') {
      let redirect_url = req.originalUrl.replace('/' + lang_in_path, match_to) || '/';
      ctx.status = 301; //301 redirect
      return res.redirect(redirect_url);
    }

    await next();//触发下一个任务
  }
}
