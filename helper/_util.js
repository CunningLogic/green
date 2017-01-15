var util = require('util');
var moment = require('moment');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var jade = require('jade');
var xss = require('xss');
var crypto = require('crypto');

module.exports = {
  format_date: function (date, format) {
    var fmt = format || 'YYYY-MM-DD';
    if (!date) return '';
    //把string date 转化为 Date,对象才能正常用moment解析
    var _date = new Date(date);
    return moment(_date).format(fmt);
  },
  concat: function () {
    return arguments.join('');
  },
  //=====渲染字符串模版,指定对象以进行变量替换，如 /api/#{country}/#{city}
  render: function (tpl, data, opt) {
    var res = tpl; //返回结果片段
    opt = opt ? opt : "#{key}";
    for (var k in data) {
      var key = opt.replace("key", k),
        reg = new RegExp(key, 'g');
      data[k] = typeof data[k] === "undefined" || data[k] === null ? '' : data[k];
      res = res.replace(reg, data[k]);
    }
    res = res.replace(/#{.*}/g, "");  //将没有替换的字段，替换为空
    return res;
  },
  is_exists: function(file_path){
    return fs.existsSync(path.dirname(require.main.filename) + file_path);
  },
  //=====判断文件是否存在 async await
  is_exists_sync: function (file_path, is_relative = true) {
    let base = path.dirname(require.main.filename) + '/',
        file_abs_path = is_relative? (base + file_path) : file_path;
    return new Promise(function(resolved){
      fs.exists(file_abs_path, function(exists){
        return resolved(exists);
      });
    });
  },
  //======obj size use MB
  obj_size: function (obj) {
    var cache = [];
    var obj_str = JSON.stringify(obj, function (key, value) {
      if (typeof value === 'object' && value !== null) {
        if (cache.indexOf(value) !== -1) { return; }
        // Store value in our collection
        cache.push(value);
      }
      return value;
    });
    cache = null;
    return obj_str.length / 1024 / 1024;
  },
  //======将指定路径下的jade模版，渲染为html
  render_jade: function (path, helper, data) {
    var root = process.cwd() + '/' + (settings.view_src || 'views') + "/",
        locals = _.assign({}, helper, data),
        file_path = root + path;
    if (!fs.existsSync(file_path)) {
      return '';
    } else {
      return jade.renderFile(file_path, locals, {});
    }
  },
  //======将指定路径下的jade模版，渲染为html
  render_html: function (path) {
    var root = process.cwd() + '/' + (settings.view_src || 'views') + "/",
        file_path = root + path;

    if (!fs.existsSync(file_path)) {
      return false;
    } else {
      return fs.readFileSync(file_path, 'utf-8');
    }
  },
  //=====是否为资源文件，如image/script/font/css
  is_assets_url: function (path) {
    var is_in_assets = /^\/(mobile\/)?(images|scripts|styles|fonts|favicon)/.test(path);
    var has_assets_end = /(.css|.js|.png|.jpg|.jpge|.gif|.webp|.ico|.eot|.svg|.ttf|.woff|.woff2|.otf)$/.test(path);

    return is_in_assets || has_assets_end;
  },
  //=====判断当前时间是否超过发布时间，超过则发布
  is_published: function (date) {
    var publish_at = date.replace('T', ' ').replace(/\..*/, ''),
        publish_time = +new Date(publish_at),
        now = Date.now();
    //时间检查，只在线上环境有效
    return settings.env !== 'production' ? true
      : now >= publish_time;
  },
  //======== 对称加密，适用于安全要求不是特别高的地方
  RC4: {
    lock: function (key, str) {
      var cip = crypto.createCipher('rc4', key),
        buf = new Buffer(str);
      return cip.update(buf, 'binary', 'hex');
    },
    unlock: function (key, en) {
      var decipher = crypto.createDecipher('rc4', key);
      return decipher.update(en, 'hex', 'binary');
    }
  },
  md5: function(content){
    return crypto.createHash('md5')
        .update(content, 'utf8').digest('hex');
  }
};


