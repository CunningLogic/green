/**
 * translator
 * for bind_helper
 */
let jade = require('jade');
let I18n = require("../../services/I18n");

I18n.config({
  url: settings.api['dji_lang'].url,
  token: settings.keys['dji_lang'],
  app: "dji_brand_site",
  Cache: Cache //global redis cache
});

module.exports = function(ctx, util){
  let req = ctx.request,
      Helper = ctx.helper;

  return new I18n(req, {
    helper: Helper.I18n,
    generate: function (params, callback) {
      let locals = params.data,
          view_file = locals.view_file,
          comps = req.components,
          html = ''; //render result

      try {
        req.render = jade.compileFile(view_file, {});
        html = req.render(locals);//get keys in jade
      } catch (err) {
        Monitor.error('jade compile error --------->');
        throw err; //throw to upstream
        return callback({status: 500}, null, null);
      }

      let keys = Helper.I18n.words,
          key_list = [];
      for (let k in keys) {
        if (keys.hasOwnProperty(k) && (keys[k] === false || req.update)) {
          key_list.push(k);
        }
      }

      return callback(null, key_list, html);
    },
    //==== 供controller等node代码中进行翻译调用
    t: function (key) {
      return function (done) {
        let option = {locale: req.locale},
          I18n = this;
        API.I18n.get_item(key, option, function (err, rest) {
          return done(err, I18n.helper.t(key));
        });
      }
    },
    query: function (keys) {
      if (!Array.isArray(keys)) keys = [keys];
      return function (done) {
        let option = {locale: req.locale},
          translate = {},
          I18n = this;
        API.I18n.get_by_once(keys, option, function (err, rest) {
          keys.forEach(key=> {
            translate[key] = I18n.helper.t(key);
          });
          return done(err, translate);
        });
      }
    }
  });
}
