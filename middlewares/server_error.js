/**
 * server_error 位于请求处理的最开始
 * middleware for server_error
 *
 * 注：try catch 并非必须的异常处理机制，中间件中包含有默认的异常处理
 * 如果希望自定义异常，可以加入 try catch，类似 ProductController 中的例子
 * 同时如果不 thorw ex 则中间件无法捕获异常，你需要自己打印异常，并跳转
 *
 * 如有疑问，请咨询 felling 或者 相关开发人员
 * */

module.exports = function (util) {
  return async function server_error(ctx, next){
    try{
      await next();
    }catch(ex){
      Monitor.error('server error: ---------->');
      console.log(ex.stack);

      ctx.response.redirect_500();
    }
  }
}
