/**
 * Created by panhongfei on 15/5/3.
 *
 * DUI Core JS，DUI is DJI UI
 * 基于jquery，用于封装官网，基础，特殊的业务逻辑
 * 旨在以最轻量的框架，支持我们自己的业务需求
 */
;
(function (W, $) {
  W.DUI = typeof DUI === "undefined" ? {} : DUI;

  /****
   * 兼容浏览器不支持的属性
   *
   * IE 不支持 W.location.origin 属性
   * 设置 W.location.host 会刷新页面
   * */
  if(!W.location.host){
    var location = W.location;
    W.location.host = location.hostname + (location.port ? ':' + location.port: '');
  }
  if (!W.location.origin) {
    W.location.origin = W.location.protocol + "//" + W.location.host;
  }

  /****
   * 提供基础页面结构，及流程支持
   *
   * 提供 init，ready 状态
   * addViews，bind等方法
   * 整个页面结构，及任务流，会自动执行，
   * 按业务逻辑需要，完善指定方法即可
   * */
  DUI.Page = function(opt){
    var defaults={
      params:{},
      init:function(){},
      ready:function(){},
      addViews:function(){
        return {};
      },
      bind:function(){
        return {};
      },
      helper:{},
      render:function(list){
        var self = this;
        if(!$.isArray(list)) list=[list];
        $.each(list,function(index,name){
          var layout=self.layouts[name];
          if(layout){
            layout.call(self,name);
          }
        });
        return self;
      },
      trigger:function(list){
        var self = this;
        if(!$.isArray(list)) list=[list];
        $.each(list,function(index,name){
          var event=self.events[name];
          if(event){
            event.call(self,{ event:name,preventDefault:function(){}} );
          }
        });
        return self;
      },
      notify:function(){
        $(document).change(function(e){
          var target= $(e.target),
              event= target.attr('dui-change');
          trigger(event, e);
        });
        $(document).click(function(e){
          var target= $(e.target),
              event= target.attr('dui-click');
          trigger(event, e);
        });

        function trigger(event, e){
          if(Page.events && $.isFunction(Page.events[event])){
            Page.events[event].call(Page,e);
          }
        }
      }
    };

    var Page=$.extend({},defaults,opt);
    ['init','addViews','bind','notify','ready'].forEach(function(fn){
      var scope = Page,
          res = Page[fn].call(scope,{params:Page.params});
      if(fn==='addViews'){
        Page.layouts=scope.layouts=res;
      }else if(fn==='bind'){
        Page.events=scope.events=res;
      }
    });

    return Page;
  };

  /****
   * 扩展常用 DUI 方法
   *
   * Template 用于模版的渲染
   * Validate 提供简单的值校验（邮箱，长度）
   * I18n 提供多语言支持，包括多语言的url
   * Storage 基于原生Storage，提供数据存储封装支持
   * Async 提供多任务并行 及 串行支持
   * */
  $.extend(DUI,{
    Template:{
      render:function(tpl,data,opt){
        var res=tpl; //返回结果片段
        if(!opt || !opt.key){ //!key,不会进行转义
          opt = $.extend({},opt,{ key: "{{key}}|{{!key}}" });
        }

        for(var k in data){
          var key=opt.key.replace("key",k),
              reg=new RegExp(key,'g');
          data[k]=typeof data[k]==="undefined"||data[k]===null?'':data[k];
          var match = res.match(reg)||[];
          $.each(match,function(index,m_key){
            if(m_key.indexOf('!'+k) == -1){
              data[k] = filterXSS(data[k]);
            }
            res=res.replace(m_key,data[k]);
          });
        }
        res=res.replace(/{{.*}}/g,"");  //将没有替换的字段，替换为空
        return res;
      },
      uri:function(url,param){
        for(var p in param)
          url=url.replace(':'+p,param[p]);
        return url;
      },
      redirect:function(url){
        var locale=DUI.Lang=="en"?"":"/"+DUI.Lang;
        return url.replace(":locale",locale);
      }
    },
    Validate:{
      email:function(value){
        return /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/g.test(value);
      },
      length:function(value,min,max){
        return !(value === ""||value.length < min||value.length > max)
      }
    },
    I18n:{
      locale:DUI.Config.locale,
      lang:DUI.Config.lang,
      url:function(path){
        var lang=this.lang=='en'?'':this.lang+'/';
        return path.replace("{locale}/",lang);
      },
      store_url:function(path){
        var location = W.location || {};
        var domain = document.domain,
            sub_domain = domain.substring(0,domain.indexOf('.')),
            origin = location.port ? location.origin.replace(':'+location.port,'') : location.origin,
            store_origin = origin.replace(sub_domain,'store');
        if(!/\/$/.test(store_origin)){
          store_origin += "/";
        }
        return store_origin + (path ? path : '');
      }
    },
    Storage:{
      setItem: function (key, value, day) {
        if (localStorage) {
          var hasEx = false;
          try {
            localStorage.setItem(key, value);
          } catch (e) {
            hasEx = true;
            if(!$.isFunction(day)){
              if (DUI.lang == 'cn') {
                alert("您处在无痕浏览，请关闭无痕浏览模式");
              }
              else {
                alert("You are in inprivate browsing, close the inprivate browsing mode");
              }
            }
          }
          if (!hasEx && $.isFunction(day)){
            day.call(this);
          }
        }
        else if ($.cookie)
          $.cookie.set(key, value, day || 7);
      },
      setJSON: function(key, value, day){
        var data="";
        try{
          data=JSON.stringify(value);
        }catch(e){
          console.log(e);
        }
        this.setItem(key,data,day);
      },
      getItem: function (key,type) {
        if (localStorage){
          var res=localStorage.getItem(key),
              data=null;
          if(type=='json'){
            try {
              data=JSON.parse(res);
            }catch(e){ data=null; }
            return data;
          }
          return res;
        }
        else if ($.cookie){
          return $.cookie.get(key);
        }
      },
      getJSON: function(key){
        return this.getItem(key,'json');
      },
      removeItem: function (key) {
        if (localStorage)
          localStorage.removeItem(key);
        else if ($.cookie)
          $.cookie.remove(key);
      }
    },
    Async:{
      parallel:function(tasks,callback){
        var leng = tasks.length,
            counter = 0,    //用于判断任务是否完成
            resList = [],   //结果集合
            errList = null, //错误集合
            handler = function(err,data){
              counter += 1;
              resList.push(data); //结果集
              if(err){
                if(!errList) errList = [];
                errList.push(err);
              }
              if(counter >= leng){
                callback(errList,resList);
              }
            };
        tasks.forEach(function(task){
          if(typeof task === 'function'){
            task.call(DUI,handler);
          }
        });
      }
    }
  });

  /****
   * 处理 mobile, pc 图片路径
   *
   * 如果图片仅在 pc端加载，使用 dui-pc-src 属性，
   * 如果仅在 mobile端加载，使用 dui-m-src 属性。
   * */
   $(function(){
     if(DUI.Config.use_mobile){
       $("[dui-m-src],[dui-m-data-layzr]").each(function(index,ele){
         $(ele).attr('src',$(ele).attr('dui-m-src') || $(ele).attr('dui-m-data-layzr'));
       });
     }else{
       $("[dui-pc-src],[dui-pc-data-layzr]").each(function(index,ele){
         $(ele).attr('src',$(ele).attr('dui-pc-src') || $(ele).attr('dui-pc-data-layzr'))
       });
     }
   });

  /****
   * 渲染模版
   *
   * 模版分为 脚本型模版( 模版需要包含于script标签中 )
   * 和 类属性模版（指定 模版的class 为 dui-tpl）
   *
   * 默认的属性引用为 {{key}}
   * */
  $.fn.render=function(options){
    var defaults={
        script:true,// 是否为脚本型 模版
        getData:function(){ return [];},
        to:function(html,to){
          if(!opt.script){
            return to.replaceWith(html);
          }else{
            if(to) return to.append(html);
          }
        },
        finish:function(root){
          if(!opt.script){
            root.removeClass('hidden');
          }
        }
      },
      opt=$.extend(defaults,options),
      context=$(this).context;

    $(this).each(function(index,ele){
      var tpl=$(ele).html(),
          data=opt.getData(),
          to=$(ele).data("to"),
          res=[];
      if(!opt.script){
        var ref=$(ele).data('dui-tpl-ref');
        tpl=ref ? ref : $(ele).find('.dui-tpl');
        if(!ref) $(ele).data('dui-tpl-ref',tpl);
      }

      to=to?$(context).find(to):$(ele).parent();
      if(!$.isArray(data))  data=[data];
      $.each(data,function(index,d){
        if(!opt.script){
          tpl.each(function(index,frag){
            var item=$(frag),
                html=DUI.Template.render(frag.outerHTML,d);
            html=html.replace(/dui-lazy-/g,'').replace('dui-tpl','');
            opt.to(html,item);
          });
        }else{
          res.push(DUI.Template.render(tpl,d));
        }
      });
      if(opt.script){
        opt.to(res.join('').trim(),to);
      }
      opt.finish($(ele));
    });
  };

  /****
   * 表单取值/设值
   *
   * 表单字段需要指定 name 属性，对应为JSON对象里的 key
   * set时，只需要指定数据对象，即可自动填充表单，注意name 与 key的对应
   * */
  $.fn.formValued=function(options){
    var form=$(this);
    options=options||{};

    return {
      get:function(){
        var res={};
        var disabled_inputs = form.find(':disabled');
        disabled_inputs.prop('disabled', false);
        var array=form.serializeArray();
        disabled_inputs.prop('disabled', true);
        $.each(array,function(index,item){
          var valued=options[item.name];
          if(valued===false)
            return true;
          else{
            if(valued&&valued.get){
              var elem=form.find("[name='"+item.name+"']");
              item.value=valued.get(elem,item.value);
            }
            if(item.value==""){
              var elem=form.find("[name='"+item.name+"']").get(0),
                isNum=(elem.type||'').toLowerCase()=='number';
              if(isNum&&elem.validity&&elem.validity.badInput){
                res[item.name]='invalid';
              }else res[item.name]=item.value;
            }else{
              res[item.name]=item.value;
            }
          }
        });
        return res;
      },
      set:function(data){
        var selector="input,textarea,select",
          elems=$(selector);
        elems.each(function(index,item){
          var elem=$(item),
            key =elem.attr('name')||elem.data('name'),
            value=data[key],
            valued=options[key];
          if(valued===false)
            return true;
          else{
            if(valued&&valued.set){
              var res=valued.set(value,elem);
              if(res) elem.val(res);
            }else elem.val(value);
          }
        });
      }
    }
  };
})(window, jQuery);
