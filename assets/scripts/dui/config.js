/**
 * Created by phf on 15/11/27.
 * you can add application cfg here
 */

(function (W, $) {
  W.DUI = typeof DUI === "undefined" ? {} : DUI;
  DUI.Config = {
    servers: ['54.204.13.248', '54.221.192.25'],
    env: "production",
    locale: "en"
  };

  var $config = $('#app-config').find('.dui-cfg'),
      doc_cfg = $('body').data();
  $config.each(function(index,cfg){
    var $cfg = $(cfg),
        type = $cfg.data('type'),
        key = $cfg.data('key')||'',
        value = $cfg.data('value')||'';
    if(type && $.isFunction(W[type])) {
      if(type == 'Boolean'){
        value = (value==='true' || value===true);
      }else{
        value = W[type](value);
      }
    }//after convert type value
    DUI.Config[key] = value;
  });

  //=====body 属性上的属性优先级高于，配置块中的配置，即覆盖
  for(var k in doc_cfg){
    if(doc_cfg.hasOwnProperty(k)){
      DUI.Config[k] = doc_cfg[k];
    }
  }
})(window, jQuery);
