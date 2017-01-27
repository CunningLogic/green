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

      // fadeout tip arrow after 2s
      var $arrow = $('.arrow-right');
      $(document).on('touchstart', function () {
        $arrow.removeClass('hidden');
        setTimeout(function () {
          $arrow.fadeOut(2000);
        }, 3000);
      });


      // parent swiper
      params.pageSwiper = new Swiper('#page-swiper', {
        parallax: true,
        height: '100%',
        onInit: function(swiper){
          if(location.hash){
            var $page =  $(location.hash);
            if($page.length > 0){
              var index = $page.data('index') || 0;
              swiper.slideTo(index, 0, true);
            }
          }

          //===== 检测屏幕状态
          helper.checkOrientation($('.horizontal-screen'));

          //===== 添加加载及入场动画
          clearSwiperAnimate(swiper); //隐藏动画元素

          var $loading = $('.loading-cover');
          $loading.fadeOut(function () {
            setTimeout(function () {
              swiperAnimateCache(swiper); //隐藏动画元素
              swiperAnimate(swiper); //初始化完成开始动画
            }, 500);
          });
        },
        onSlideChangeStart: function (swiper) {
          console.log(swiper.activeIndex);

          if([2,4,5].indexOf(swiper.activeIndex) > -1){
            $('.edit-controls').show();
          }else{
            $('.edit-controls').hide();
          }
        },
        onSlideChangeEnd: function(swiper){
          swiperAnimate(swiper); //每个slide切换结束时也运行当前slide动画
        }
      });

      //===== child swiper
      var photoSwiper = new Swiper('#top-photos-swiper', {
        parallax: true,
        //nested: true,
        height: '100%',
        onSlideChangeStart: function () {
          clearSwiperAnimate();
        },
        onSlideChangeEnd: function(swiper){
          swiperAnimate(swiper); //每个slide切换结束时也运行当前slide动画
        }
      });

      params.swipers = {
        '#top-photos-swiper': photoSwiper
      };


      if($('#others-list-pages').children().length > 0){
        var pw = new pageSwitch('others-list-pages',{
          duration: 600,           //int 页面过渡时间
          direction: 0,            //int 页面切换方向，0横向，1纵向
          start:0,                //int 默认显示页面
          loop:false,             //bool 是否循环切换
          ease:'ease',            //string|function 过渡曲线动画，详见下方说明
          transition:'slideCover',     //string|function转场方式，详见下方说明
          freeze:false,           //bool 是否冻结页面（冻结后不可响应用户操作，可以通过 `.freeze(false)` 方法来解冻）
          mouse:true,             //bool 是否启用鼠标拖拽
          mousewheel:false,       //bool 是否启用鼠标滚轮切换
          arrowkey:false,         //bool 是否启用键盘方向切换
          autoplay:false,         //bool 是否自动播放幻灯 新增
        });

        params.swipers['#others-list'] = pw;
      }
    },
    bind: function () {
      $(".fancybox").each(function (index, ele) {
        var $fancybox = $(ele),
            params = $fancybox.data();
        params.closeBtn = !params['hiddenclosebtn'];
        params.wrapCSS = params['wrapcss'];

        $fancybox.fancybox($.extend({
          type : 'iframe',
          padding : 15,
          margin: 20,
          autoScale : false,
          autoCenter  : true,
          transitionIn : 'none',
          transitionOut : 'none',
          closeBtn: true,
          helpers : {
            media : {},
            overlay:{
              locked: false
            }
          }
        }, params));
      });


      $('.canvas-blur').each(function(){
        var $item = $(this),
            $canvas = $(this).find('.canvas-bg'),
            $bgImg = $(this).find('.bg-img');

        $bgImg.one('load', function() {
          onImgLoad();
        }).each(function() {
          if(this.complete){ onImgLoad(); }
        });

        function onImgLoad(){
          var blur = $item.data('blur') || 50;

          StackBlur.image($bgImg.get(0), $canvas.get(0), blur, true, {
            imgWidth: $('body').width(),
            imgHeight: $('body').height()
          });
        }
      });


      var $photoSwipre = $('.photo-swiper'),
          swipers = {};

      $photoSwipre.delegate('.swiper-thumb', 'tap click', function () {
        var $item = $(this),
            $parentSwiper = $item.parents('.photo-swiper'),
            swiperId = $parentSwiper.data('swiper'),
            $swiper = swipers[swiperId],
            currentSwiper = params.swipers[swiperId];

        params.pageSwiper.detachEvents(); //锁定父 swiper 滑动

        var to = parseInt($item.data('index') || '0');
        if(currentSwiper.slideTo){
          currentSwiper.slideTo(to, 0, true);
        }else if(currentSwiper.slide){
          currentSwiper.slide(to);
        }


        if(!$swiper){
          swipers[swiperId] = $swiper = $(swiperId); //cache

          $swiper.find('.swiper-close').on('touchend click', function () {
            $swiper.animate({
              opacity: 0
            }, 500, function () {
              $swiper.css('z-index', -1);
            });

            $parentSwiper.find('.ani').css('visibility', 'visible');
            params.pageSwiper.attachEvents(); //解除锁定父 swiper 滑动
          });
        }

        $swiper.css('z-index', 9).animate({
          opacity: 1
        }, 500);
      });

      // 检测很屏幕状态
      var $tip = $('.horizontal-screen'),
          event = "onorientationchange" in window ? "orientationchange" : "resize";
      window.addEventListener(event, function () {
        helper.checkOrientation($tip);
      }, false);

      var $editBar = $('.edit-controls');
      $('.close-edit').on('touchend click', function () {
        $editBar.remove(); //remove editbar
        return false;
      });

      return {
        share:function () {
          alert('请点击微信右上角 • • • ，分享链接到朋友圈.');
        }
      }
    },
    helper: {
      checkOrientation: function($tip) {
        if (window.orientation == 90 || window.orientation == -90) {
          $tip.removeClass('hidden'); //横屏
        } else {
          $tip.addClass('hidden'); //竖屏
        }
      }
    }
  });

})();