var _ = require('lodash');

module.exports= function(req){
  return {
    meta: function(){
      var meta = {
        title: null,
        description: null,
        keywords : null,
        nofollow: null
      },
      helper = req.helper;

      var reg = /(^\/)|(\/$)/g;
      var _path = req.path.toLowerCase().replace(reg,"").replace(/\//g,'_');

      var title_key = 'v2.seo.meta.title.' + _path;
      var title_description = 'v2.seo.meta.description.' + _path;
      var title_keywords = 'v2.seo.meta.keywords.' + _path;
      var title_nofollow = 'v2.seo.meta.nofollow.' + _path;

      meta.title = helper.wt(title_key) !== title_key ? helper.wt(title_key) : null;
      meta.description = helper.wt(title_description) !== title_description ? helper.wt(title_description) : null;
      meta.keywords = helper.wt(title_keywords) !== title_keywords ? helper.wt(title_keywords) : null;
      meta.nofollow = helper.wt(title_nofollow) !== title_nofollow ? helper.wt(title_nofollow) : null;

      return meta;
    }
  }
};
