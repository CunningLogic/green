/**
 * Monitor
 *
 * 前端资源监控
 * */

;(function(W, D, $){
  var Monitor = {
    errors: [], //非css资源的 not found 捕获，或者 js exception
    styles: [], //样式资源，需要发送到后端分析
    config: {
      url: '/api/monitor/report',
      base: '' //base path, 使用这个参数，以减小 url 长度
    }, //监控配置
    start: function(cfg){
      var monitor = this;
      $.extend(this.config, cfg); //扩展配置

      D.addEventListener("error", function (e) {
        var target = e.target || {};
        monitor.errors.push(e.target.outerHTML);
      }, true);
      window.onerror = function (message, file, line, col, error) {
        monitor.errors.push("onerror: " + message);
      };
      window.addEventListener("error", function (e) {
        var error = (e||{}).error || {};
        monitor.errors.push("error listener: " + error.message);
      });

      W.onload = function(){
        [].forEach.call(D.getElementsByTagName('link'), function(item){
          if(/\.css$/.test(item.href)){
            var href = item.href.replace(monitor.config.base, "{base}");
            monitor.styles.push(href);
          }
        });
      };

      W.onbeforeunload = function(e){
        setTimeout(function(){
          Monitor.report(); //关闭或者刷新页面时，发送报告
        }, 0);
      };

      return this;
    },
    report: function(params, done){
      var cfg = this.config;
      var service = (params && params.name) || {
          name: 'assets/analysis',
          priority: 4,
          page: location.href,
          data: {
            styles: this.styles,
            errors: this.errors,
            base: cfg.base
          },
          except:['page', 'callback', '_', 'length'] //不参与 md5 运算, 否则会被视作不同任务执行
        }
      var length = JSON.stringify(service).length;

      //===== IE url length should < 2083
      if(length > 2000){
        this.styles = [];
        this.errors = ['url length more than limit 2000, total length: ' + length];
      }
      service.length = length;

      $.ajax({
        jsonp: "callback",
        dataType: "jsonp",
        url: cfg.url,
        data: service,
        success: function(res){
          console.log(res);
        }
      });
    }
  };

  Monitor.start({
    url: 'http://www.dbeta.me/api/monitor/report',
    base: 'djicdn.com/assets/styles/build'
  });

  W.Monitor = Monitor;
})(window, document, jQuery);
