/**
 * HTTP Server Settings
 *
 * Configuration for the underlying HTTP server in KOA.
 * Only applies to HTTP requests (not WebSockets)
 *
 * 配置 http请求处理的相关中间件
 */
let helper = require('../helper/global');
let middlewares = require('../middlewares');

let util = helper.helper;

module.exports = function(app) {
  //======== 按指定顺序，添加中间件到请求处理队列
  let orders = [
    'begin',
    'static_assets',  //静态资源中间价, 必需位于 自定义中间件之前
    'server_error',   //异常处理
    'redirect_v1',    //根据 kao 的回环特性，next 部分指导最后才会被处理
    'process_url',    //url 大写转小写
    'i18n_locale',    //多语言
    'ip_country',     //通过IP，进行国家定位
    'is_mobile',      //判断当前设备类型
    'sub_domain',     //对子域名 subdomain 进行链接转换
    'read_cache',  //读取页面缓存
    'ddos',        // 对 post 请求进行 ddos 限制
    'extend_context', //绑定 helper 方法到请求实例
  ];

  middlewares(orders).forEach(middle => {
    app.use(middle(util));
  });
};



