var express = require('express');
var router = express.Router();

var articles=require('./articles');

module.exports=function(app){
    /* GET home page. */
    app.get('/', function(req, res, next) {
        res.render('index', { title: 'Green House' });
    });

    app.get('/work/f2e', function(req, res, next) {
        res.render('work/f2e/index.html',{});
    });

    app.get('/photos', function(req, res, next) {
        res.render('photos.html',{});
    });

    articles(app);
};
