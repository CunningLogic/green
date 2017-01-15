/**
 * work controller
 * */

module.exports = {
  pages: async function (page) {
    let req = this.request,
        res = this.response;

    console.log('articles/' + (page || 'top'));
    await this.render_view('articles/' + (page || 'top'));
  }
};