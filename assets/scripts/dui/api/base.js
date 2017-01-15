/**
 * Created by panhongfei on 15/5/3.
 *
 * 提供基础 API 接口支持，
 * 建议所有 ajax 调用均使用此接口
 * 返回数据格式，{
 *   success: true/false,
 *   status: 200/422/500,
 *   data: { first:{},list:[] },
 *   message: { first:{},list:[] }
 * }
 */
(function (W, $) {
  W.DUI = typeof DUI === "undefined" ? {} : DUI;

  DUI.API = {
    Factory: function (option, form) {
      var defaults = {
          api: {
            method: 'get',
            url: ''// '/api/user/login'
          },
          filter: ['input:text', 'input:hidden', 'input:password', 'textarea', 'select'],
          notice:'', //notice ele
          cache:'', //cache key
          security: function (data) {
            //if you need you can add md5
            for (var p in data)
              data[p] = encodeURIComponent(data[p]);
            return data;
          },
          validate: function (data) {
          },
          source: function () {
            //if form is null return
            if (!(form && form.find))  return {};

            var data = {},
              rqs = {},
              type = this.filter.map(function (s) {
                var hasK = s.indexOf('input:') > -1;
                if (hasK) s = s.replace('input:', '');
                return hasK ? 'input[type=' + s + ']' : s;
              });
            form.find(type.join(",")).each(function (index, ele) {
              var input = $(ele),
                key = input.attr("name"),
                value = input.val();
              data[key] = {
                value: value,
                error: input.data("error"),
                success: input.data("success"),
                ele: input
              };
              rqs[key] = value;
            });
            data.rqs = rqs;
            return data;
          },
          complete: function (msg, res) {
            //handle invalid msg
            if (msg)  opt.error(msg);
            //handle response
            if (res.success) {
              switch (res.status) {
                case 200:
                  opt.success(res);
                  break;
                default:
                  opt.error(res.extra.msg);
                  break;
              }
            } else {
              opt.error(res.extra.msg);
            }
          },
          showMask:function(){
            return false;
          },
          error: function (msg) {},
          success: function (res) {}
        },
        opt = $.extend(defaults, option);//扩展配置

      return this._build(opt);
    },
    _build: function (opt) {
      return {
        _doing: false,    //prevent redo
        submit: function (success,fail) {
          if(opt.cache){
            var cache=DUI.Storage.getJSON(opt.cache);
            if(cache) return success.call(this,cache);
          }

          var self = this,
              raw = opt.source() || {},
              error = opt.validate(raw, DUI.Validate, []) || [],
              helper = DUI.API._helper;
          fail = $.isFunction(fail) ? fail : function(){};
          self.notice.clear();//clear notice msg

          helper.Caller = self; //set callback caller
          helper.Option = opt;
          if (error.length <= 0) {
            if (self._doing) return;
            self._doing = true;   //prevent redo

            var param = {
              data : opt.security(raw.rqs ? raw.rqs : raw),
              method : opt.api.method,
              url : opt.api.url,
              ajax: opt.ajax,
              option: opt
            };

            helper.handlePost(param, function (res) {
              if (res.status == 200 && $.isFunction(success)){
                if(opt.cache){
                  DUI.Storage.setJSON(opt.cache,res,function(){});
                }
                success.call(self,res);
              }
              else fail.call(self,((res.extra||{}).msg||{}).first||'', res);
              self._doing = false;
            });
          } else {
            helper.completeDone(error, function (err,msg) {
              self._doing = false;
              fail.call(self,msg.first);
            });
          }

          return self;
        }, // end of submit
        notice:{
          ele:$(opt.notice),
          clear:function(){
            if(this.ele.length>0) this.ele.html('');
          },
          success:function(msg,color){
            color = color||'#008800';
            if(this.ele.length>0){
              this.ele.html('<span style="color:'+color+'">'+msg+'</span>');
            }else{
              console.log("%c"+msg,'color:'+color);
            }
          },
          error:function(msg,color){
            color = color||'#E92B2B';
            if(this.ele.length>0){
              this.ele.html('<span style="color:'+color+'">'+msg+'</span>');
            }else{
              console.log("%c"+msg,'color:'+color);
            }
          }
        }
      };
    },
    _helper: {
      // ======response default
      _doing: false,
      Caller: null,
      Option: null,
      Result: {
        success: false,
        status: 400,
        data: [],
        extra: {
          msg: []  //format can be string or array
        }
      },
      handlePost: function (param, fn) {
        var helper = DUI.API._helper;

        setTimeout(function(){
          $(document).trigger('onRequest',{option: param.option});
        },0);

        if(param.method.toLowerCase() != 'get'){
           //===== 如果参数中带有 www-cache ， 不进行csrf校验
           param.data['www-cache']='official';
           if(!param.data['_csrf']){
             param.data['_csrf']= DUI.Config._csrf||'403';
           }
        }

        var ajax_default={
          url: param.url,
          data: param.data,
          dataType: 'json',
          type: param.method,
          timeout: 10000,
          headers: {
            Accept: 'application/vnd.green-v1',
            Lang: DUI.Lang || 'cn',
            "Access-Control-Allow-Origin":"https://www.dji.com,https://www.dbeta.me"
          },
          success: function (res) {
            res = $.extend({}, helper.Result, res);
            helper.pushTextStatus(res); //获取状态消息

            $.each([res.data, res.extra.msg], function (index, d) {
              d = $.isArray(d) ? d : [d];
              d = {first: d[0], list: d};
              index == 0 ? res.data = d : res.extra.msg = d;
            });

            fn.call(this, res);
            helper.Option.complete.call(helper.Caller, null, res, fn);//调用完成函数
          },
          complete: function (xhr, textStatus) {
            if (textStatus == 'timeout') {
              helper.completeDone("request time out", fn);
            }
            $(document).trigger('onComplete',{option: param.option, status: xhr.status});
          },
          statusCode: {
            302: function () {
              helper.completeDone("302 , api is moved.", fn);
            },
            404: function () {
              helper.completeDone("404 , api is not found.", fn);
            },
            500: function () {
              helper.completeDone("500 , server error , please try again.", fn);
            }
          }
        };
        //=== if user overwrite ajax config
        if($.isPlainObject(param.ajax))
          $.ajax($.extend({},ajax_default,param.ajax));
        else
          $.ajax(ajax_default);
      },
      pushTextStatus: function (res) {
        var msg = res.extra.msg;
        if (!$.isArray(msg))
          res.extra.msg = msg ? [msg] : [];
        switch (res.status) {
          case 422:
            if (typeof msg == "undefined")
              res.extra.msg.push('params is invalid , please check.');
            break;
        }
      },
      //======调用完成函数
      completeDone: function (error, fn) {
        error = $.isArray(error) ? error : [error];
        var msg = {
            first: error[0]||'',
            list: error
          },
          opt = this.Option;
        fn.call(this, error,msg);
        opt.complete.call(this.Caller, msg, this.Result, fn);
      }
    }
  };


  /**
   * 管理 mask 对象
   */
  W.Mask = DUI.Mask ={
    $mask:$('body').find('#mask'),
    locked:false,
    lock:function(locked){
      this.locked=locked;
    },
    show:function(msg){
      if(!this.$wait){
        this.$wait = this.$mask.find('.wait-msg');
      }

      this.$wait.html(msg); //add tip msg
      this.$mask.show().removeClass('hidden');
      return this;
    },
    hide:function(){
      this.$mask.hide().addClass('hidden');
      return this;
    }
  };

  //=====监听请求发起
  $(document).on('onRequest',function(e,data){
    var option=data.option;
    if(option.showMask()){
      Mask.show();
    }
  });
  //=====倾听请求完成
  $(document).on('onComplete',function(e,data){
    var option=data.option;
    if(option.showMask()&&!Mask.locked) {
      Mask.hide();
    }
  });
})(window, jQuery);
