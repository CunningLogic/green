(function($,W){
  $(function(){
      $("#content").delegate(".photo-wrap img","mouseover mouseleave",function(){
          $(this).toggleClass("gray");
      });

      var layzr = new Layzr({
        container: null,
        selector: '[data-layzr]',
        attr: 'data-layzr',
        retinaAttr: 'data-layzr-retina',
        bgAttr: 'data-layzr-bg',
        hiddenAttr: 'data-layzr-hidden',
        threshold: 50,
        callback: null
      });

      $("#content .fancybox").fancybox({
          padding : 15,
          autoScale : false,
          transitionIn : 'none',
          transitionOut : 'none',
          helpers : {
              media : {},
              buttons : {}
          }
      });
  });
})(jQuery,window);