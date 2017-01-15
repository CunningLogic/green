/**
 * work controller
 * */

module.exports = {
  pages: async function (page) {
    let req = this.request,
        res = this.response,
        htmlPage = (page || 'f2e') + '/index.html',
        html = req.helper.render_html('work/' + htmlPage);

    if(html){
      this.status = 200;
      this.body = html;
    }else{
      return res.redirect_404();
    }
  }
};