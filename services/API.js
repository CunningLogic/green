
/**
 * API of service
 *
 * 这里加载的服务会通过请求全局变量,req.API 来向上提供接口
 * 只会加载数组中指定的服务，如果需向外提供服务，需将服务模块的名称加入
 *
 * 外部调用方法如，req.API.I18n.get(key,callback)
 */

var Base=require('./API_Base');
var modules = {
  Builder: require("./Builder")
}; //load modules


module.exports={
  Base: {
    Status: {
      SUCCESS: 200,
      BAD_REQUEST: 400,
      UNAUTHORIZED: 401,
      NOT_FOUND: 404,
      INVALID_PARAMS: 422,
      SERVER_ERROR: 500
    },
    result: function (suc, status, data, extra) {
      if (!Array.isArray(data)) data = [data];
      if (!extra) extra = {};
      if (typeof extra === 'string') {
        extra = {msg: extra};
      }
      return {success: suc, status: status, data: data, extra: extra};
    }
  },
  bind:function(req) {
      var api_base = Base(req),
      merged = Object.assign({
        Builder: modules.Builder(req),
        Base: api_base,
        request: api_base.request
      }, this.Base);

    for (var k in modules) {
      var res = modules[k];
      if (typeof res === 'function') {
        res = res(req, api_base);
      }
      merged[k] = _.merge({},api_base, res);
    }
    return merged;
  }
};
