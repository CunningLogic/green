/**
 * HomeController.js
 *
 * @description :: Server-side logic for managing comments.
 */
const fs = require('fs');

module.exports = {
  page: async function (page) {
    await this.render_view('upload/' + page, {});
  },
  image: async function() {
    let req = this.request,
        res = this.response,
        file = this.request.body.files.file;

    if (!file || (req.body.fields.fileLen != file.size)) {
      return res.failure(403, {} , {msg: '文件不存在，或者传输数据大小校验不一致, 请重试'});
    }

    let path = file.path.replace(settings.base_path + '/.tmp/public', '');
    Monitor.green('图片上传成功, path：' + path);
    res.success(200, {path: path} ,{msg: 'upload image success.'});
  }
};
