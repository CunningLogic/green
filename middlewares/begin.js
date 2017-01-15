/**
 * begin 位于请求处理的最开始
 * middleware for begin
 * */

module.exports = function (util) {
  //===== 如果不进行 ddos 限制，则直接到下一个中间件
  return function begin(ctx, next){
    let req = ctx.request,
        is_assets = util.is_assets_url(req.url);

    console.log(is_assets, req.url);

    if(!is_assets){
      for(let i = 0; i < 3; i++){
        console.log('');// empty line for request start
      }
    }
    ctx.timestap = new Date();
    req.is_assets = is_assets;//this request is a assets ?
    return next();
  }
}
