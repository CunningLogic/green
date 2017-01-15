var _ = require('lodash');
var path = require('path');

module.exports=function(req){
  return {
    description_item:function(item){
      var diff = _.difference(_.keys(item),['zip', 'pdf', 'exe', 'dmg', 'url', 'msi', 'qrcode', 'app']);
      return ( diff.sort().toString() == _.keys(item).sort().toString()&&  _.includes(_.keys(item),'date'));
    },
    download_title_icon:function(title){
      title = title.toString().toUpperCase();
      if (title.indexOf("LATEST")> -1 || title.indexOf("最新")> -1)
        return "fa-flag-o";
      else if(title.indexOf("DISCLAIMER")> -1 || title.indexOf("声明")> -1)
        return "fa-info-circle";
      else if (title.indexOf("MANUAL")> -1 || title.indexOf("手册")> -1)
        return "fa-book";
      else if (title.indexOf("SOFTWARE")> -1 || title.indexOf("软件")> -1)
        return "fa-cubes";
      else if (title.indexOf("APP")> -1)
        return "fa-tablet";
      else
        return "fa-file-text-o";
    },
    download_sub_title:function(title){
      if (_.includes(['For Mac', 'Mac'], title['str'])) {
        return 'Mac';
      }
      if (_.includes(['For Windows', 'Windows'], title['str'])) {
        return 'Windows';
      }
    },
    download_sub_title_include:function(title){
      // console.log(title['str']);
      if(_.includes(['For Windows', 'Windows', 'For Mac', 'Mac'], title['str'])){
        return true
      }
    },
    description_items:function(items, i){
      var results = [];
      i += 1;
      while(i < items.length && description_item_include(items[i])){
        results.push(items[i]);
        i += 1;
      }
      if(_.compact(results) == false){
        return false
      }
      return results;
    },
    download_icon:function(type){
      if(_.includes(['zip', 'pdf'], type)){
        return "fa-file-" + type + "-o"
      }
      else{
        return "fa-download"
      }
    },
    is_simple:function(slug){
      return _.includes(['led-bluetooth-indicator', 's800-evo-frame-arm', 's800-vibration-absorber-kit', 'iosd-mini', 'btu', '1038-10-inch-propeller', 'landing-gear-for-flame-wheel', '2-4g-bluetooth-datalink', 'iosd-mini'], slug);
    },
    is_show_feature_menu:function(product){
      var excluded_slugs = ['phantom-fc40', 'dt7-dr16-rc-system', 'ipad-ground-station'];
      console.log(_.isEmpty(product.feature));
      return (!_.isEmpty(product.feature) && !_.includes(excluded_slugs,product.slug) || is_include(product.slug));
    },
    image_360:function(url){
      var path = url.split('|')[0];
      var range =  url.split('|')[1];
      var start = range.split('..')[0];
      var stop  = range.split('..')[1];
      var url_array = [];
      for (var i = start; i <= stop; i++) {
        url_array.push(helper.s3_cdn("/images/"+path.replace('#', i)));
      }
      return url_array;
    },
    get_page_meta:function(){
      if(typeof req.page_meta=='undefined' || !req.page_meta){
        if(req.product){
          var product=req.product;
          return {
            title: product.meta_title,
            description: product.meta_description,
            canonical: product.meta_canonical,
            keywords: product.meta_keywords
          };
        }else return {};
      }else{
        return req.page_meta;
      }
    },
    //======用于页面选中当前 tab
    set_tab:function(tab){
      req.currentTab=tab;
    },
    active_tab:function(tab,css){
      if(req.currentTab==tab){
        return css ? css : 'active';
      } else{ return ""; }
    },
    //========产品是否已发布
    is_published:function(product){
      var publish_at = (product['published_at']||'').replace('T',' ').replace(/\..*/,''),
          publish_time = + new Date(publish_at),
          now = Date.now();
      return now >= publish_time;
    },
    //========产品在移动端是否重构
    is_build_m:function(product){
      var no_bulid_list = ['a2','naza-m-v2','wookong-m','e310','e305','iosd-mark-ii','ipad-ground-station','pc-ground-station','dropsafe'];
      return !_.includes(no_bulid_list, product.slug);
    },
    has_buy_link:function(product){
      if(!product) return false;
      if(!(_.isEmpty(product.buy_link.offical_link))){
        return true;
      } else if((_.include(['flame-wheel-arf', 'naza-m-lite','naza-m-v2', 'landing-gear-for-flame-wheel'], product.slug) && I18n.locale != 'en')) {
        return true;
      } else {
        return false;
      }
    }
  }
};

function in_array(value, array) {
  for(var i in array) {
    if(array[i] == value) return true;
  }
  return false;
}

function description_item_include(item){
  var diff = _.difference(_.keys(item),['zip', 'pdf', 'exe', 'dmg', 'url', 'msi', 'qrcode', 'app']);
  return ( diff.sort().toString() == _.keys(item).sort().toString()&&  _.includes(_.keys(item),'date'));
}


function is_include(tpl){
  var path_feature = '/views/products/' + tpl + '/feature.jade';
  return helper.is_exists(path_feature);
}









