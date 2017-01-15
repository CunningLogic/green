/***
 * middlewares
 *
 * 为了按需加载中间件，同时能够按顺序执行，
 * 不使用遍历加载，而是在 config/http.js 手动指定
 * */

var path = require('path');
var basePath = path.join(__dirname);

module.exports = function (orders = [], returnObj = false) {
  let middlewares = {};
  if(!Array.isArray(orders)){
    orders = [orders]; // to array
  }

  let orderMiddles = orders.map(name => {
    console.log(name);

    let filePath = path.join(basePath, name),
        middleware = require(filePath);
    middlewares[name] = middleware; //build middleware object
    return middleware; //return to array
  });

  return returnObj ? middlewares: orderMiddles;
};

