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

;(function ($, window, document){

  $.fn.flyCanvas = function (options){
    $.fn.flyCanvas.init(this, $.extend({}, $.fn.flyCanvas.defaults, options));
    return this;
  };

  $.fn.flyCanvas.imageList=[];

  $.fn.flyCanvas.defaults = {
    pre    : '',
    ext    : '.png',
    speed  : '50',
    action : 'scroll',  //hover , scroll , click
    loop   : false,
    auto   : false
  };

  $.fn.flyCanvas.init = function (items, settings){
    items.each(function() {
      var $item        = $(this),
          params       = $item.params = $.extend({}, settings, $item.data() ,$item.find('.animation').data()),
          $cavs_target = $(params.canvas_id);

      for (var i = params.start, len = params.end; i <= len; i++) {
        var image = new Image();
        image.src = params.root + params.path + '/' + params.pre + i + params.ext;
        (function (img) {
          img.onload = function () {
            img.load = true;
          }
        })(image);
        $.fn.flyCanvas.imageList.push(image);
      }

      //- self.timer = setInterval(function () {
      //-   //- requestAnimFrame(animate);
      //- }, params.speed);


      if(params.action == 'hover'){
        hoverIt($cavs_target, params)
      }

    });


    function hoverIt($cavs, param, imageList) {

      var images  = $.fn.flyCanvas.imageList;
      var canvas  = $cavs[0];
      var ctx     = canvas.getContext('2d'),
          stageW  = canvas.width,
          stageH  = canvas.height;
      var counter = 0;
      var mouseIn = false;
      ctx.drawImage(images[0], 0, 0);
      var hoverIn,hoverOut = null;

      $cavs.on("mouseover mouseout",function(event){
        if(event.type == "mouseover"){
          mouseIn = true;
          hoverIn = setInterval(function () {
            requestAnimFrame(startFly);
          }, param.speed);

        }else if(event.type == "mouseout"){
          mouseIn = false;
          hoverOut = setInterval(function () {
            requestAnimFrame(endFly);
          }, param.speed);
        }
      });

      function startFly(){
        if (images[counter]&&images[counter].load && mouseIn) {
          ctx.clearRect(0, 0,stageW,stageH);
          ctx.drawImage(images[counter], 0, 0);
          counter ++;
        }
        if (counter >= images.length - 1 || !mouseIn){
          clearInterval(hoverIn);
        }
      }

      function endFly(){
        if (images[counter]&&images[counter].load && !mouseIn) {
          ctx.clearRect(0, 0,stageW,stageH);
          ctx.drawImage(images[counter], 0, 0);
          counter --;
        }
        if (counter <= 0 || mouseIn){
          clearInterval(hoverOut);
        }
      }
    }
  };

  $('.dji-fly-set').flyCanvas();
}( jQuery, window, document ));



