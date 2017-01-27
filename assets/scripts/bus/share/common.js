/**
 * common js to share
 * */

!(function (W, $) {
  DUI.Page({
    init:function () {},
    ready:function () {
      DUI.Layzr = this.helper.layzr;
      this.helper.layzr();
    },
    addViews: function () {
      return {};
    },
    bind: function () {
      return {};
    },
    helper:{
      layzr:function () {
        //layzr懒加载调用
        var layzr = new Layzr({
          selector: '[data-layzr]',
          attr: 'data-layzr',
          retinaAttr: 'data-layzr-retina',
          bgAttr: 'data-layzr-bg',
          threshold: 50,
          callback: null
        });
      }
    }
  });
})(window, jQuery);