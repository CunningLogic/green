/**
 * Created by panhongfei on 15/6/7.
 */
(function(W){
  W.MUI = typeof MUI === "undefined" ? {} : MUI;
  MUI.helper={
    loadScripts:function(paths){
        var scripts=paths.split(','),
            doc=document;
        scripts.forEach(function(src){
            doc.write('<script src="'+src+'"><\/script>');
        });
    }
  }
})(window);
