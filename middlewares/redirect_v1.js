/**
 * redirect_v1
 * middleware for sub_domain
 *
 * 404 not found dna redirect to old site
 * 注意，此中间件的 next 后部分，在所有自定义中间件的最后才会执行
 * 也就是最后执行的是 redirect_v1 = redirect to old site
 **/

module.exports = function (util) {
  //===== 如果不进行 ddos 限制，则直接到下一个中间件
  return async function redirect_v1(ctx, next){
    let res = ctx.response;
    ctx.status = 102; //processing

    await next(); //first process next, finally redirect v1

    //====== 根据 status判断，请求是否已经被处理过，if not => old site
    if(res.redirect_404 && ctx.status === 102){
      console.log('redirect_v1');
      res.redirect_404('config/http');
    }
  }
}
