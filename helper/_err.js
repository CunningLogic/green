

module.exports={
  errorRedirect:function(err, res){
    if (err == '404') return res.redirect_404();
    if (err == '502') return res.redirect_500();
  }
};


