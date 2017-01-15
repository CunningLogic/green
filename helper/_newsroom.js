var _ = require('lodash');
var path = require('path');

module.exports={
  type_info_path:function(news_model,category){
  	var category_slug = category? category : "news";
    if(category == 'altitude'){
      return 'altitude/' + news_model.slug;
    }

    return 'newsroom/' + category_slug + '/' + news_model.slug;
  },
  return_newsroom:function(req,res){	//data(slug) == null ==> redirect_to(newsroom index)
    var locale_path = req.helper.get_locale_path();

    return res.redirect(301, locale_path +'newsroom');
  },
  get_timestamp : function(){
    var timestamp = Math.round(new Date().getTime()/1000);
    console.log('timestamp----------->'+timestamp);
    return timestamp;
  }
};

