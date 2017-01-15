/**
 * Created by phf on 15/9/23.
 *
 * 提供基础的 API 接口支持，便于调用
 */
;
(function(){

  $.fn.login = function(option){
    var form=$(this),
        api_url=location.origin+form.attr('action');

    return DUI.API.Factory($.extend({
      api:{
        method:form.attr('method'),
        url:api_url.replace('http://','https://')
      },
      notice:form.attr('notice'),
      cache:'dji[user]',
      validate:function(data,V,error){
        var email=data["email"],
            pwd=data["password"];
        var methods=['email','length'];   //验证方法
        if(!pwd.value)
          error.push(pwd.ele.data('blank'));
        else if(!email.value)
          error.push(pwd.ele.data('blank'));
        else
          $.each([email,pwd],function(index,obj){
            if(!V[methods[index]](obj.value.toLowerCase().trim()))
              error.push(obj.error);
          });
        return error;
      }
    },option),form);
  };

  $.fn.register = function(option){
    var form=$(this),
        api_url=location.origin+form.attr('action');
    return DUI.API.Factory($.extend({
      api:{
        method:form.attr('method'),
        url:api_url.replace('http://','https://')
      },
      notice:form.attr('notice'),
      validate:function(data,V,error){
        var email=data["email"],
            pwd=data["password"];
        var methods=['email','length'];   //验证方法
        if(!pwd.value)
          error.push(pwd.ele.data('blank'));
        else if(!email.value)
          error.push(pwd.ele.data('blank'));
        else
          $.each([email,pwd],function(index,obj){
            var fn=methods[index],
                method=V[fn],
                value=obj.value.toLowerCase().trim();
            if(fn!="length"&&!method(value)){
              error.push(obj.error);
            }else if(fn=='length'){
              if(!method(value,6,24)) error.push(obj.error);
            }
          });
        return error;
      }
    },option),form);
  };

  DUI.Activity = {
    create: function(option){
      var form = $(this.form),
          conf = DUI.Config;

      return DUI.API.Factory($.extend({
        api:{
          method:form.attr('method'),
          url:form.attr('action')
        },
        security: function(data){
          for (var p in data)
            data[p] = encodeURIComponent(data[p]);
          data["_csrf"] = conf._csrf;
          return data;
        }
      },option),form);
    },
    generateToken: function(callback){
      //=====第一次请求，异步获取token
      if(!DUI.Config._csrf){
        $.get("/api/csrf?cache=no",function(res){
          var _csrf = res._csrf||'403';
          DUI.Config._csrf = _csrf;
          callback && callback(_csrf);
        });
      }
      else callback && callback("403");

      return DUI.Activity;
    }
  };


  DUI.queryCarts = function(uuid){
    var I18n=DUI.I18n;
    return DUI.API.Factory({
      api:{
        url:I18n.url('/{locale}/api/user/cart'),
        method:'get'
      },
      source:function(){
        return {uuid:uuid};
      },
      validate:function(data,V,error){
        if(!uuid){
          error.push('param uuid is required.');
        }
        return error;
      }
    });
  };

  DUI.qeuryPrice = function(slugs){
    return DUI.API.Factory({
      api:{
        url: '/api/product/price',
        method:'get'
      },
      source:function(){
        if($.isArray(slugs)){
          slugs = slugs.join(','); // phatom-4,phantom-3
        }

        var country = DUI.Cookie.get('country') || DUI.Cookie.get('www_country') || '';
        return {slugs: slugs, country: country}; //string
      },
      validate:function(data,V,error){
        if(!slugs){
          error.push('param slugs is required.');
        }
        return error;
      }
    });
  };

  // 点击上报
  DUI.dataReport = function(param){
    return DUI.API.Factory({
      api:{
        url: '/api/data_report',
        method:'get'
      },
      source:function(){
        return {scope: param[0], content: param[1], report_type: param[2]}; //string
      },
      validate:function(data,V,error){
         console.log($.isArray(param))
        if(!$.isArray(param) && param.length == 3){
          error.push('参数的格式为：[scope, content, report_type]，请输入正确的参数！');
        }
        return error;
      }
    });
  }
})();
