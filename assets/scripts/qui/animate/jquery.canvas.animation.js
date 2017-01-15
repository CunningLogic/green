/**
 * Created by panfei on 2015/1/22.
 */

/**
 * define  module of  requestAnimationFrame
 * */
;(function($) {
  window.requestAnimFrame=(function(callback){
    return window.requestAnimationFrame||
        window.webkitRequestAnimationFrame||
        window.mozRequestAnimationFrame||
        window.oRequestAnimationFrame||
        window.msRequestAnimationFrame||
        function(callback){
          callback.call();
        };
  })();
})(jQuery);


/**
 * jquery.scrollEvent
 * */
(function( $ ) {
  var _mid = function(a, b) { return (a + b) / 2; };
  var _inRange = function(l, r, v) { return l < v && v < r; };

  $.fn.scrollIntoEvent = {
    objs: (new Array()),
    prev: $(window).scrollTop(),

    handler: function() {
      var _scroll = $.fn.scrollIntoEvent;
      var sTop = $(document).scrollTop(); ///document vs window
      var sHeight = $(window).height();
      var sBottom = sTop + sHeight;

      $.each(_scroll.objs, function(index, item) {
        var mid = _mid(item.top, item.bottom);
        //sTop-=sHeight/2;
        //console.log(sTop+","+sBottom+" , "+mid);
        if (_inRange(sTop, sBottom, mid)) {

          if (!item.entered) {
            if (item.onEnter !== null) {
              item.onEnter();
            }
            item.entered = true;
          }
        } else {
          if (item.entered) {
            if (item.onLeave !== null) {
              item.onLeave();
            }
            item.entered = false;
          }
        }
      });

      _scroll.prev = $(window).scrollTop();
    },
  };

  $.fn.scrollIntoEvent = $.extend(function(options) {
    var defaults = {
      onEnter: null,
      onLeave: null,
      areaTopOffset: 0,
      areaBottomOffset: 0
    };

    var opt = $.extend(defaults, options);

    var areaTopOffset = opt.areaTopOffset;
    var areaBottomOffset = opt.areaBottomOffset;
    var onEnter = opt.onEnter;
    var onLeave = opt.onLeave;

    return this.each(function() {
      var pos = $(this).offset().top;
      var height = $(this).height();
      // console.log(pos);
      // console.log(height);
      // console.log($.fn.scrollEvent.objs);
      // console.log($.fn.scrollEvent.prev);

      var objs = $.fn.scrollIntoEvent.objs;
      var top = pos + areaTopOffset;
      var bottom = pos + height + areaBottomOffset;
      var mid = _mid(top, bottom);
      objs.push({
        entered: false,
        top: top,
        bottom: bottom,
        mid: mid,
        onEnter: onEnter,
        onLeave: onLeave,
      });

      // handle for the already entered one
      $.fn.scrollIntoEvent.handler();
    });
  }, $.fn.scrollIntoEvent);

  $(window).scroll(function() {
    $.fn.scrollIntoEvent.handler();
  });
})( jQuery );


/**
 * jquery.animation  of canvas
 * */
$(function () {
  $.fn.animation = function (opt) {
    var canvas=this[0],
        ctx = canvas.getContext('2d'),
        stageW = canvas.width,
        stageH = canvas.height,
        frames = [];
    $.each(opt.paths, function (index, item) {
      var imageList = [];
      for (var i = item.s, len = item.e; i <= len; i++) {
        var image = new Image();
        var source = item.path + "/" + item.pre + i + item.ext;
        source = smartImage.optimizeSource(source);
        image.src = source;
        (function (img) {
          img.onload = function () {
            img.load = true;
          }
        })(image);
        imageList.push(image);
      }
      frames.push(imageList);
    });
    return {
      wait: function (time, fn) {
        var timer = setTimeout(function () {
          fn.call(this);
          clearTimeout(timer);
        }.bind(this), time);
      },
      finish: function () {
        if (this.timer) clearInterval(this.timer);
      },
      doAnimation: function (index, speed, isInflite, onfinish, extra) {
        this.finish();//结束上一个动画
        var frame = frames[index] ? frames[index] : [];
        extra || (extra = {});

        if (frame && frame.length > 0) {
          var self = this,
              image = null,
              counter = 0;

          if (extra.reverse) {
            counter = frame.length - 1;
          }

          self.timer = setInterval(function () {
            requestAnimFrame(animate);
          }, speed);

          function animate(){
            image = frame[counter];
            if (image&&image.load) {
              ctx.clearRect(0, 0,stageW,stageH);
              ctx.drawImage(image, 0, 0);
              if (extra.reverse) {
                if (--counter < 0) {
                  if (!isInflite) {
                    if (typeof onfinish === 'function') onfinish(self);
                    else if (typeof onfinish === 'string' && window[onfinish]) window[onfinish](self);
                    clearInterval(self.timer);
                  } else {
                    counter = frame.length; //reset
                  }
                }
              } else {
                if (++counter >= frame.length) {
                  if (!isInflite) {
                    if (typeof onfinish === 'function') onfinish(self);
                    else if (typeof onfinish === 'string' && window[onfinish]) window[onfinish](self);
                    clearInterval(self.timer);
                  }
                  else counter = 0; //reset
                }
              }
            }
          }

        }//end if
      }//end of do
    }
  };//end of animate

  var frameSet = $(".dji-animation-set");
  $.each(frameSet, function (index, ele) {
    var frame =$(ele),
        animateSet = frame.find('.animation'),
        stage = $(frame.attr("data-canvas")),
        root=frame.attr("data-root")||"",
        offset = frame.attr("data-offset")|| 0,
        options = [],
        autoIndex = -1,
        Ani = null;
    $.each(animateSet, function (index, ani) {
      var ani = $(ani),
          option = JSON.parse(ani.attr("data-option")),
          control = $(ani.attr("data-control")),
          trigger = control.attr("data-trigger"),
          action = control.attr("data-action");

      control.bind(trigger, function () {
        if (typeof window[action] === 'function')
          window[action].call(Ani, Ani, $);
      });

      if(root) option.path=root+option.path;
      options.push(option);
      if (option.auto) autoIndex = index;
    });

    Ani = stage.animation({paths: options});
    if (autoIndex > -1 && autoIndex < animateSet.length)
      Ani.doAnimation(autoIndex, options[autoIndex].speed || 50, !!options[autoIndex].loop,options[autoIndex].onfinish);

    // if not auto,will be done when scroll into view
    stage.scrollIntoEvent({
      areaTopOffset:offset,
      onEnter:function(){
        var opt= options[0];
        if(opt.loop||opt.multi||!this.done){
          Ani.doAnimation(0,opt.speed,opt.loop,opt.onfinish);
        }
        stage.trigger("onRollInView",{Ani:Ani,$:$});
        this.done=true;
      },
      onLeave:function(){
        if(options[0].loop)
          Ani.finish();
        stage.trigger("onRollOutView",{Ani:Ani,$:$});
      }
    });
  });

});
