/**
 * Created by panhongfei on 15/5/3.
 */
(function (W, $) {
    W.MUI = typeof MUI === "undefined" ? {} : MUI;

    MUI.API = {
      Factory: function (option,form) {
         var defaults = {
               api: {
                   method: 'get',
                   url: ''// '/api/user/login'
               },
               filter:['input:text','input:password','textarea','select'],
               security: function (data) {
                   //if you need you can add md5
                   for (var p in data)
                       data[p] = encodeURIComponent(data[p]);
                   return data;
               },
               validate: function (data) {},
               source: function () {
                   //if form is null return
                   if (!(form && form.find))  return {};

                   var data = {},
                       rqs = {},
                       type = this.filter.map(function (s) {
                           var hasK=s.indexOf('input:')>-1;
                           if(hasK) s=s.replace('input:','');
                           return hasK?'input[type=' + s + ']':s;
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
               error: function (msg) {},
               success: function (res) {}
             },
             opt = $.extend(defaults, option);//扩展配置

             return this._build(opt);
        },
        _build:function(opt){
            return {
                _doing: false,    //prevent redo
                submit: function (fn) {
                    var self = this,
                        raw = opt.source() || {},
                        error = opt.validate(raw, MUI.Validate, []) || [],
                        helper=MUI.API._helper;

                    helper.Caller = self; //set callback caller
                    helper.Option=opt;
                    if (error.length <= 0) {
                        if (self._doing) return;
                        self._doing = true;   //prevent redo

                        var data = opt.security(raw.rqs ? raw.rqs : raw),
                            method = opt.api.method,
                            url = opt.api.url;
                        helper.handlePost(url, data, method, function (res) {
                            if (res.status == 200 && $.isFunction(fn))  fn(res);
                            self._doing = false;
                        });
                    } else {
                        helper.completeDone(error, function () {
                            self._doing = false;
                        });
                    }
                } // end of submit
            };
        },
        _helper:{
            // ======response default
            _doing:false,
            Caller:null,
            Option:null,
            Result:{
                success:false,
                status:400,
                data:[],
                extra:{
                    msg:[]  //format can be string or array
                }
            },
            handlePost: function (url,data,method,fn) {
                var helper=MUI.API._helper;
                // send request
                $.ajax({
                    url: url,
                    data: data,
                    dataType: 'json',
                    type: method,
                    timeout: 10000,
                    headers: {
                        Accept: 'application/vnd.green-v1',
                        Lang: MUI.Lang||'cn'
                    },
                    success: function (res) {
                        res = $.extend({},helper.Result, res);
                        helper.pushTextStatus(res); //获取状态消息

                        $.each([res.data, res.extra.msg], function (index, d) {
                            d = $.isArray(d) ? d : [d];
                            d = {first: d[0], list: d};
                            index == 0 ? res.data = d : res.extra.msg = d;
                        });

                        fn.call(this,res);
                        helper.Option.complete.call(helper.Caller, null, res,fn);//调用完成函数
                    },
                    complete: function (xhr, textStatus) {
                        if (textStatus == 'timeout') {
                            helper.completeDone("request time out",fn);
                        }
                    },
                    statusCode: {
                        302: function () {
                            helper.completeDone("302 , api is moved.",fn);
                        },
                        404: function () {
                            helper.completeDone("404 , api is not found.",fn);
                        },
                        500: function () {
                            helper.completeDone("500 , server error , please try again.",fn);
                        }
                    }
                });
            },
            pushTextStatus:function(res){
                var msg=res.extra.msg;
                if(!$.isArray(msg))
                    res.extra.msg=msg?[msg]:[];
                switch(res.status){
                    case 422:
                        if(typeof msg=="undefined")
                            res.extra.msg.push('params is invalid , please check.');
                        break;
                }
            },
            //======调用完成函数
            completeDone: function(error,fn){
                error=$.isArray(error)?error:[error];
                var msg={
                    first:error[0],
                    list:error
                },
                opt=this.Option;
                fn.call(this,error);
                opt.complete.call(this.Caller,msg,this.Result,fn);
            }
        }
    };
})(window, jQuery);