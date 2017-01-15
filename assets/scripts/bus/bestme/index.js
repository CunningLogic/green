/**
 * bestme editor
 * */

!(function(){

  var context = {},
      helper = {},
      params = {};
  DUI.Page({
    init: function () {
      context = this;
      helper = this.helper;
      params = this.params;

      // parent swiper
      new Swiper('#page-swiper', {
        parallax: true,
        height: '100%',
        onInit: function(swiper){
          if(location.hash){
            var $page =  $(location.hash);
            if($page.length > 0){
              var index = $page.data('index') || 0;
              swiper.slideTo(index, 0, false);
            }
          }
        }
      });
      // child swiper
      new Swiper('#top-photos-swiper', {
        parallax: true,
        nested: true,
        resistanceRatio: 0,
        height: '100%'
      });
    },
    bind: function () {
      $(".fancybox").fancybox({
        type : 'iframe',
        padding : 15,
        autoScale : false,
        autoCenter  : true,
        transitionIn : 'none',
        transitionOut : 'none',
        showCloseButton: true,
        helpers : {
          media : {},
          overlay:{
            locked: false
          }
        }
      });


      $('.top-item').each(function(){
        var $canvas = $(this).find('.canvas-bg'),
            $bgImg = $(this).find('.bg-img');

        $bgImg.one('load', function() {
          onImgLoad();
        }).each(function() {
          if(this.complete){
            onImgLoad();
          };
        });

        function onImgLoad(){
          console.log($('body').width());

          StackBlur.image($bgImg.get(0), $canvas.get(0), 50, true, {
            imgWidth: $('body').width(),
            imgHeight: $('body').height()
          });
        }
      });

      var pw = new pageSwitch('top-list',{
        duration:600,           //int 页面过渡时间
        direction:1,            //int 页面切换方向，0横向，1纵向
        start:0,                //int 默认显示页面
        loop:false,             //bool 是否循环切换
        ease:'ease',            //string|function 过渡曲线动画，详见下方说明
        transition:'flow',     //string|function转场方式，详见下方说明
        freeze:false,           //bool 是否冻结页面（冻结后不可响应用户操作，可以通过 `.freeze(false)` 方法来解冻）
        mouse:true,             //bool 是否启用鼠标拖拽
        mousewheel:false,       //bool 是否启用鼠标滚轮切换
        arrowkey:false,         //bool 是否启用键盘方向切换
        autoplay:false,         //bool 是否自动播放幻灯 新增
      });
    },
    helper: {}
  });

})();