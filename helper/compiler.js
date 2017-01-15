/**
 * Created by pan hong fei on 15/8/17.
 *
 * 根据jquery的依赖（在组件目录下的 package.json 中声明），
 * 生成 依赖文件列表，便于合并及打包
 *
 * @param {string} dir - 生成指定目录下的依赖
 * @param {function} handler - 完成后的回调
 */

module.exports = function (dir, handler) {
  var gulp = require('gulp'),
      path = require('path'),
      async = require('async');
  //console.log(__dirname);
  var rootPath = __dirname.replace('helper', 'public'),
      scriptPath = path.join(rootPath, 'javascripts'),
      depTree = {},
      depList = [];

  if (dir) {
    var busPath = path.join(scriptPath, 'bus', dir);
    buildDeps('main', path.join(busPath, dir + '.js'), function (key, file_path, err) {
      if (err) {
        handler(null, err);
      } else if (key === 'main') {
        depList.push(file_path.replace(dir, path.join(dir, 'src')));
        depTree[key] = depList.length;
        handler({list: depList, tree: depTree, bus: busPath, root: rootPath, key: key});
      }
    });
  }

  function buildDeps(key, file_path, finish) {
    var file_dir = file_path;
    if (file_dir.indexOf('.js') > -1)
      file_dir = path.dirname(file_dir);
    //console.log('--------');
    //console.log(file_dir);
    gulp.src(path.join(file_dir, 'package.json')).on('data', function (file) {
      var content = file.contents.toString(),
        config = JSON.parse(content),
        deps = config.dependencies || {},
        length = 0,
        paths = [];
      for (var p in deps) {
        if (typeof deps[p] === 'object') {
          var deepPath = path.join(scriptPath, p);
          for (var m in deps[p]) {
            paths[p + "-" + m] = path.join(deepPath, m, deps[p][m]);
          }
        } else {
          paths[p] = path.join(scriptPath, deps[p]);
        }
        length++;//依赖对象的长度
      }
      if (length === 0 && !depTree[key]) {
        depList.push(file_path);
        depTree[key] = depList.length;
        finish();//执行callback
      }
      else {
        var handlerQun = [];
        for (var k in paths) {
          handlerQun.push((function (k) {
              return function (callback) {
                if (!depTree[k]) {
                  buildDeps(k, paths[k], function () {
                    if (!depTree[k]) {
                      depList.push(paths[k]);
                      depTree[k] = depList.length;
                    }
                    callback();
                  });
                } else {
                  callback();
                }
              };
            })(k)
          );
        }
        //====并发执行配置读取操作，全部完成后回调
        async.series(handlerQun, function (err, res) {
          finish(key, file_path, err);
        });
      }
    });
  }
};
