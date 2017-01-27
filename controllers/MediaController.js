/**
 * HomeController.js
 *
 * @description :: Server-side logic for managing comments.
 */
const fs = require('fs');
const musicAPI = require('music-api');
const Builder = require('../services/Builder.js')({});

module.exports = {
  page: async function (page) {
    await this.render_view('media/' + page, {});
  },
  image: async function() {
    let req = this.request,
        res = this.response,
        file = this.request.body.files.file,
        basePath = settings.base_path + '/.tmp/public';

    if (!file || (req.body.fields.fileLen != file.size)) {
      return res.failure(403, {} , {msg: '文件不存在，或者传输数据大小校验不一致, 请重试'});
    }

    let path = file.path.replace(basePath, '');
    Monitor.green('图片上传 本地 成功, path：' + path);

    var errors = [],
        cdn_config = Object.assign({ basePath , folder: ''}, settings.qbox);

    await new Promise(function (resolve) {
      Builder.Util.publish_qbox({ path }, cdn_config, function (err) {
        if(!err){
          Monitor.green('图片上传 CDN 成功, path：' + path);
        }else{
          errors.push('图片上传 CDN 失败, path：' + path);
          Monitor.error('图片上传 CDN 失败, path：' + path);
        }
        return resolve(path);
      });
    });

    res.success(errors.length > 0 ? 400 : 200, {path: path} ,{
      msg: errors.join(',') || 'upload image success.'
    });
  },
  music: async function () {
    let req = this.request,
        res = this.response,
        params = req.query || {},
        type = params.type || 'netease',
        key = params.key || '',
        method = params.method || 'searchSong';

    if (!key || !musicAPI[method]) {
      return res.success(404, {} , {msg: '未找到相关的音乐文件'});
    }

    let result = await musicAPI[method]('netease', {
      key: key,
      limit: 10,
      page: 1
    });

    res.success(200, result ,{msg: `搜索音乐成功 from: ${type}, sone:${key}`});
  }
};
