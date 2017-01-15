/**
 * Upload Images
 * */

!(function(){
  DUI.Image = {
    upload: function (imageData) {
      return DUI.API.Factory({
        api: {
          method: 'post',
          url: '/api/upload/image'
        },
        ajax:{
          processData: false,
          contentType: false
        },
        notice: '.msg',
        source: function () {
          if(!(imageData && imageData.formData)){
            return {}; //return empty data
          }

          var formData = imageData.formData;
          formData.append('fileLen', imageData.fileLen);

          return formData;
        },
        validate: function (data, V , errors) {
          if(!(imageData && imageData.base64)){
            errors.push('请先选择一张图片后，开始上传');
          }
          return errors;
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
      //var file = document.querySelector('#file');
    },
    addViews: function () {
      var $photo = $('.photo .upload-photo'),
          $infoTpl = $('#infoTpl');

      return {
        renderPhoto: function (info) {
          $infoTpl.next().remove();
          $infoTpl.render({
            getData: function () {
              return info;
            }
          });

          $photo.attr('src', info.base64);
        }
      }
    },
    bind: function () {
      return {
        onUploadFile: function (e) {
          helper.uploadFile(e.target, function(err, rest){
            params.imageData = rest;
          });
        },
        submit: function (e) {

          var imageData = params.imageData;
          DUI.Image.upload(imageData).submit(function (rest) {
            var data = (rest.data||{}).first || {};

            //===== 如果以iframe方式加载，则通知父窗口
            var parent = window.parent;
            parent.$(parent.document).trigger('upload:image:finish', data);

            this.notice.success('图片已经上传成功');
          }, function (err) {
            this.notice.error(err);
            console.log(err);
          });
        }
      }
    },
    helper: {
      uploadFile: function (_this, done) {
        lrz(_this.files[0])
            .then(function (rest) {

              var sourceSize = helper.toFixed2(_this.files[0].size / 1024),
                  resultSize = helper.toFixed2(rest.fileLen / 1024),
                  scale = parseInt(100 - (resultSize / sourceSize * 100));
              var imageInfo = {
                base64: rest.base64,
                sourceSize: sourceSize,
                resultSize: resultSize,
                scale: scale //压缩比例
              };
              //render photo tpl
              context.layouts['renderPhoto'](imageInfo);

              return rest;
            })
            .then(function (rest) {
              console.log('preview image:', rest);
              return done(null, rest);
            })
            .catch(function (err) {
              return done(err, {});
            })
            .always(function () {
              // 不管是成功失败，都会执行
              console.log('finish');
            })
      },
      toFixed2: function (num) {
        return parseFloat(+num.toFixed(2));
      }
    }
  });

})();