/**
 *  @option Number|Date expires Either an integer specifying the expiration date from now on in days or a Date object.
 *                             If a negative value is specified (e.g. a date in the past), the cookie will be deleted.
 *                             If set to null or omitted, the cookie will be a session cookie and will not be retained
 *                             when the the browser exits.
 * @option String path The value of the path atribute of the cookie (default: path of page that created the cookie).
 * @option String domain The value of the domain attribute of the cookie (default: domain of page that created the cookie).
 * @option Boolean secure If true, the secure attribute of the cookie will be set and the cookie transmission will
 *                        require a secure protocol (like HTTPS).
 *  @author pan hong fei
 */

(function($){
  DUI.Cookie=$.cookie={
    support:navigator.cookieEnabled,

    set:function(name,value,options){
      if (this.support) {
        //include
        options = options || {};

        var expires = "";//expires time
        //if option is number , used as time
        if(typeof options==='number') {
          var day= options;
          options={expires:day};
        }
        if(!options.expires) options.expires = 3; //default 3 days will expires
        if (options.expires && (typeof options.expires == 'number' || options.expires.toUTCString)) {
          var date;
          if (typeof options.expires == 'number') {
            date = new Date();
            date.setTime(date.getTime() + (options.expires * 24 * 60 * 60 * 1000));
          } else {
            date = options.expires;
          }
          expires = '; expires=' + date.toUTCString(); // use expires attribute, max-age is not supported by IE
        }
        var path = options.path ? '; path=' + options.path : '';
        var domain = options.domain ? '; domain=' + options.domain : '';
        var secure = options.secure ? '; secure' : '';
        document.cookie = [name, '=', encodeURIComponent(value), expires, path, domain, secure].join('');
        return true;
      }
      else {
        console.log("cookie not supported !");
        return false;
      }
    },
    get:function(name){
      if (this.support) {
        var cookies=document.cookie.split(';');//按分隔符解析字符串
        for(var i=0;i<cookies.length;i++)
        {
          var cookie = jQuery.trim(cookies[i]);
          if (cookie.substring(0, name.length + 1) == (name + '='))//如果是要查找的name
            return  decodeURIComponent(cookie.substring(name.length + 1));//返回name的value
        }
        return null;
      }
      else {
        console.log("cookie not supported !");
        return null;
      }
    },
    remove:function(name,options){
      if (this.support) {
        options=options||{};
        options.expires=-1;
        if (this.set(name, "", options))
          return true;
        else
          return false;
      }
      else {
        console.log("cookie not supported !");
        return false;
      }
    }
  };
})(jQuery);
