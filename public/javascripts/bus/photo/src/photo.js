(function($,W){
  $(function(){
      $("#content").delegate(".photo-wrap img","mouseover mouseleave",function(){
          $(this).toggleClass("gray");
      });

      $(".photo-wrap img").lazyload({
          attr:"data-original"
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