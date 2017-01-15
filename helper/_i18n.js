var _ = require('lodash');

module.exports = function (req) {
  return {
    availableLocales: ['en', 'zh-CN', 'zh-TW', 'ja', 'ko', 'de', 'fr', 'es'],
    availableLanguages: ['en', 'cn', 'zh-tw', 'jp', 'kr', 'de', 'fr', 'es'],
    langugaeToLocale: {'cn': 'zh-CN', 'zh-tw': 'zh-TW', 'jp': 'ja', 'kr': 'ko'},
    I18n: {
      words: {},
      set: function (key, text, key_locale, text_obj) {
        var locale = key_locale || req.locale,
            map = {},
            words = req.I18n.words;

        //缓存对象引用，应用 LRU 过期策略
        //Cache.appCache.set(locale_key, {
        //  ref: words,
        //  scope: locale,
        //  key: key,
        //  length: text.length
        //});
        //
        //=======如果时线上环境，如果没有翻译，则使用对应的备选翻译
        var show_key = !!req.query['show_keys'] || settings.env == 'development';
        if (!text && text_obj && !show_key) {
          text = text_obj[(map[locale] || 'en')];
        }
        words[key] = text;
      },
      t: function (key) {
        var locale = req.locale,
            words = req.I18n.words;
        var text = words[key];
        if (!text) {
          words[key] = false;
        }
        return text ? text : key;
      }
    },
    is: function (locale) {
      if (locale == 'cn') locale = 'zh-CN';
      if (locale == 'kr') locale = 'ko';
      if (locale == 'zh-tw') locale = 'zh-TW';
      return req.locale_key == locale;
    },
    is_country: function (code) {
      req.geo_country = req.geo_country || 'unknown';
      return req.geo_country.toLowerCase() == code.toLowerCase();
    },
    www_view: function (name) {
      return req.I18n.t("view." + name);
    },
    www_overview: function (name, slug) {
      var product = req.product || {},
          key = (product.i18n_slug || product.uslug) + '.overview.' + name;
      return req.wt(key);
    },
    www_feature: function (name, slug) {
      var product = req.product || {},
          key = (product.i18n_slug || product.uslug) + '.feature.' + name;
      return req.wt(key);
    },
    www_feature_v2: function (name, slug) {
      var product = req.product || {};
      var key = 'v2.product.' + (product.i18n_slug || product.uslug) + '.' + name;

      return req.wt(key);
    },
    wt: function (name) {
      return req.I18n.t(name);
    },
    is_i18n_key: function (key) {
      req.www_view('product.support.wiki_title');//缓存一下这个wiki
      return !(req.I18n.t(key) == key);
    }
  };
};
