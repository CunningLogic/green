/**
 * ddos 处理子域跳转
 * middleware for sub_domain
 * */

//======对于 post 请求，每分钟仅允许3个post请求
let Ddos = require('ddos-express')({
    rules: [{regexp: ".*", maxWeight: 3}],
    checkInterval: 1000 * 60,
    logFunction: function (ip, path) {
      Monitor.error('ip request many time------->' + ip);
      console.log(path);
    }
  }
);

module.exports = function (util) {
  //===== 如果不进行 ddos 限制，则直接到下一个中间件
  return async function ddos(ctx, next){
    let req = ctx.request,
        res = ctx.response;

    if(req.method.toUpperCase() === "POST" && settings.ddos !== 'disabled'){
      //==== 模拟 express res 的 status send 方法
      let express_res = {
        status: function(code){
          ctx.status = code; //res status
          return express_res;
        },
        send: function(data){
          ctx.body = data; //send data
        }
      }
      Ddos(req, express_res, function(){});
    }

    return await next();
  }
}
