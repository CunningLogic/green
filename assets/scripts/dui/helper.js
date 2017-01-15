/**
 * Created by panhongfei on 15/6/7.
 */
(function(W){
  W.DUI = typeof DUI === "undefined" ? {} : DUI;
  DUI.helper={
    loadScripts:function(paths){
        var scripts=paths.split(','),
            doc=document;
        scripts.forEach(function(src){
            doc.write('<script src="'+src+'"><\/script>');
        });
    },
    flowStats: function() {
      window.flowStats = function (path, param) {
        path = path.replace(/\/$/,'');

        path = path.replace(/(&|\?)?from=buy_now/g,'');

        var hash = path.split('#')[1];
        path = path.split('#')[0];

        if (path.indexOf('?') > -1){
          path = path + '&';
        }else{
          path = path + '?';
        }

        path = path + 'site=brandsite';

        if (path.indexOf('from=') < 0 && param){
          path = path + '&from=' + param;
        }

        if(hash) path = path + '#' + hash;

        return path;
      }
    }
  }
  DUI.helper.flowStats();
})(window);
