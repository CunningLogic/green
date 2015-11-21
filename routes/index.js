var express = require('express');
var router = express.Router();

var articles_rotue=require('./articles'),
    compile_rotue=require('./compile');

var compiler=require('../helper/compiler');

module.exports=function(app){
    /* GET home page. */
    app.get('/', function(req, res, next) {
        res.render('index', { title: 'Green House' });
    });

    app.get('/javascripts/bus/:name', function(req, res, next) {
        var name =req.params.name,
            dir=name.replace(/(\.js|-min\.js)/g,'');
      console.log('------');
        if(name.indexOf('min.js')>-1){
            var path=req.url.replace(name,dir+'/build/'+name);
            res.writeHead(200, { 'Content-Type': 'text/javascript' });
            res.end('MUI.helper.loadScripts("'+path+'")');
        }
        else{
         compiler(dir,function(dep,err){
             if(err){
                 res.json({success:false,status:'400',error:err});
             }else if(dep){
                 var list=dep.list.map(function(src){
                   return src.replace(dep.root,'');
                 });
                 res.writeHead(200, { 'Content-Type': 'text/javascript' });
                 res.end('MUI.helper.loadScripts("'+list.join(',')+'")');
             }
         });
          //var list=combo(req.search);
          //console.log(req.search);
        }
    });

    app.get('/work/f2e', function(req, res, next) {
      res.render('work/f2e/index.html',{});
    });
    app.get('/work/springxiao', function(req, res, next) {
      res.render('work/springxiao/index.html',{});
    });
    app.get('/work/springxiao', function(req, res, next) {
      res.render('work/springxiao/index.html',{});
    });

    app.get('/photos', function(req, res, next) {
        res.render('photos.html',{});
    });

    articles_rotue(app);
    compile_rotue(app);
};
