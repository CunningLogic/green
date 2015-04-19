var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Green House' });
});

router.get('/work/f2e', function(req, res, next) {
    res.render('work/f2e/index.html',{});
});

router.get('/photos', function(req, res, next) {
    res.render('photos.html',{});
});

module.exports = router;
