/**
 * serach music
 *
 * 参考链接： https://github.com/LIU9293/musicAPI
 * */

!(function (W, $) {

  DUI.Music = {
    search: function (params) {
      return DUI.API.Factory({
        api: {
          method: 'get',
          url: '/api/music/search'
        },
        notice: '.msg',
        security: function (data) {
          return data;
        },
        source: function () {
          return params;
        },
        validate: function (data, V , errors) {
          if(!(data && data.key)){
            errors.push('请输入需要搜索的关键字');
          }
          return errors;
        },
        showMask: function () {
          return true;
        }
      })
    }
  }

  var context = {},
      helper = {},
      params = {};
  DUI.Page({
    init: function () {
      context = this;
      helper = this.helper;
      params = this.params;
      params.music = {};
      //var file = document.querySelector('#file');
    },
    addViews: function () {
      var $form = $('#music-form'),
          $infoTpl = $form.find('#infoTpl');

      return {
        renderMusicList: function (list) {
          $infoTpl.parent().find('.music-item').remove();
          $infoTpl.render({
            getData: function () {
              return list.map(function (item) {
                var data = {
                  songId: item.id,
                  cover: item.album.cover + '?param=360y360',
                  title: item.name || '未知',
                  album: item.album.name,
                  artist: (item.artists[0] || {}).name || '未知',
                  needPay: item.needPay ? '付费歌曲' : '免费'
                };

                context.params.music[item.id] = data;
                return data;
              });
            }
          });
        }
      }
    },
    bind: function () {
      var $form = $('#music-form'),
          $searchText = $form.find('#input_search'),
          $list = $form.find('.music-list');

      $list.delegate('.music-item', 'click', function (e) {
        context.events['select'](e, $(this));
      });

      return {
        search: function (e) {
          e.preventDefault();

          var key = $searchText.val();
              params = {
                type: '',
                key: key,
                //method: 'searchAlbum'
              };

          DUI.Music.search(params).submit(function (rest) {
            var data = (rest.data||{}).first || {};

            context.layouts['renderMusicList'](data.songList);

            this.notice.success('* 搜索完成, 点击可选择音乐（付费音乐不可使用）');
          }, function (err) {
            this.notice.error(err);
            console.log(err);
          });
        },
        select: function (e, $item) {
          var songId = $item.attr('id'),
              data = context.params.music[songId];
          console.log('trigger event, select:music:finish');

          //===== 如果以iframe方式加载，则通知父窗口
          var parent = window.parent;
          parent.$(parent.document).trigger('select:music:finish', data);
        }
      }
    },
    helper: {

    }
  });

})(window, jQuery);