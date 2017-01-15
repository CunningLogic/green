/**
 * 
 *  data-radius 设置加载区间
 *  data-src    设置<img data-src='url'>
 *  data-bgsrc  设置设置背景懒加载<div data-bgsrc='url'>
 *  
 * 
 * */




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

        if (_scroll.inRange(item.top, item.bottom)) {

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
    inRange: function(areaTop, areaBottom) {
      var sTop = $(document).scrollTop();
      var sHeight = $(window).height();
      var sBottom = sTop + sHeight;

      if(sBottom > areaTop && sTop < areaBottom){
        return true;
      }else{
        return false;
      }

    }
  };

  $.fn.scrollIntoEvent = $.extend(function(options) {
    var defaults = {
      onEnter: null,
      onLeave: null,
      areaTopOffset: 0,
      areaBottomOffset: 0,
      radius : 0
    };

    var opt = $.extend(defaults, options);

    var radius = opt.radius;
    var areaTopOffset = opt.areaTopOffset;
    var areaBottomOffset = opt.areaBottomOffset;
    var onEnter = opt.onEnter;
    var onLeave = opt.onLeave;

    return this.each(function() {

      var pos = $(this).offset().top;
      var height = $(this).outerHeight();
      var objs = $.fn.scrollIntoEvent.objs;
      var top = pos - radius - areaTopOffset;
      var bottom = pos + height + radius + areaBottomOffset;

      objs.push({
        entered: false,
        top: top,
        bottom: bottom,
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



$(function () {

  $('.lazyImg').each(function () {
    var $this = $(this);
    var $thisBgSrc = 'url("' + $this.data('bgsrc') + '")';

    var _loadData = {
      areaTopOffset: $this.data('top') || 0,
      areaBottomOffset: $this.data('bottom') || 0,
      radius: $this.data('radius') || 0,
      imgSrc: $this.data('src') || null,
      bgSrc: $thisBgSrc || null
    };

    $this.scrollIntoEvent({
      radius: _loadData.radius,
      areaTopOffset: _loadData.areaTopOffset,
      areaBottomOffset: _loadData.areaBottomOffset,
      onEnter: function () {
        if (_loadData.imgSrc) {
          $this.attr('src', _loadData.imgSrc);
        } else if (_loadData.bgSrc) {
          $this.css({"background-image": _loadData.bgSrc});

        }
      }
    });
  });

});
