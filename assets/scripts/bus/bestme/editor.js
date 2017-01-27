/**
 * bestme editor
 * */

!(function(){
  DUI.Bestme = {
    save: function (params) {
      return DUI.API.Factory({
        api: {
          method: 'POST',
          url: '/api/bestme'
        },
        source: function () {
          return params;
        },
        security: function (data) {
          return data;
        },
        validate: function (data, V , errors) {
          return errors;
        },
        showMask: function () {
          return true;
        }
      });
    }
  };


  var context = {},
      helper = {},
      params = {};
  DUI.Page({
    init: function () {
      context = this;
      helper = this.helper;
      params = this.params;
    },
    bind: function () {
      var $form = $('#editor-form'),
          $music = $form.find('#music-panel');

      var $item = null,
          $input = null,
          $picture = null,
          $img = null;

      $(".fancybox").fancybox({
        type : 'iframe',
        padding : 0,
        autoScale : false,
        autoCenter  : true,
        transitionIn : 'none',
        transitionOut : 'none',
        showCloseButton: true,
        wrapCSS: 'fancybox-editor',
        helpers : {
          media : {},
          overlay:{
            locked: false
          }
        }
      }).on('click', function () {
        $item = $(this),
        $input = $item.next('input'),
        $picture = $item.find('.picture'),
        $img = $picture.find('img');
      })
      
      $(document).on('upload:image:finish', function (evt, data) {
        if(!data){
          return console.error('图片数据获取失败');
        }

        if($img.length === 0){
          $picture.append('<img src="'+ data.path +'">');
        }else{
          $img.attr('src', data.path);
        }
        $input.val(data.path); //set path value

        $.fancybox.close(); //关闭上传窗口
      });

      var $musicTitle = $music.find('.music_title'),
          $musicLink = $music.find('.music_link'),
          $musicCoverImg = $music.find('.music_cover_img'),
          $musicCoverText = $music.find('.music_cover_hidden');
      $(document).on('select:music:finish', function (evt, data) {
        if (!data) {
          return console.error('图片数据获取失败');
        }

        $musicTitle.val(DUI.Template.render("【{{title}}】- {{artist}}", data));
        $musicLink.val(DUI.Template.render("http://music.163.com/song/{{songId}}", data));

        $musicCoverImg.attr('src', data.cover);
        $musicCoverText.val(data.cover);

        $.fancybox.close(); //关闭窗口
      });

      var $baiduLink = $form.find('.baidu_link');
      $form.find('.baidu_search').on('change', function () {
        var link = $baiduLink.data('href').replace('{{word}}', $(this).val());
        $baiduLink.attr('href', link);
      });

      return {
        save: function (e) {
          var valued = $form.formValued(),
              params = valued.get();
          DUI.Bestme.save(params).submit(function(rest){
             parent.location.reload();
             console.log(rest);
          }, function(err){
             console.log(err);
          });
        }
      }
    },
    helper: {}
  });

})();