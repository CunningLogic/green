var express = require('express');
var router = express.Router();
var fs = require('fs');

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
    app.get('/funny', function(req, res, next) {
      res.render('articles/funny.jade',{});
    });

    app.get('/photos', function(req, res, next) {
        res.render('photos.html',{});
    });

    app.get('/gift/flower/:code', function(req, res, next) {
      var file_path = process.cwd() + '/data/location.json';

      var ip_from = (req.headers['x-forwarded-for'] || '').split(',')[0] || req.connection.remoteAddress || req.ip,
          code = req.params.code || 1314520888;
      var location = JSON.parse(fs.readFileSync(file_path, 'utf-8'));
      if(code == 'show'){
        return res.json(location);
      }

      var result = {
        code: code,
        ip_from: ip_from,
        date: new Date(),
        count: 1
      };
      if(!location[ip_from]){
        location[ip_from] = result;
      }else{
        location[ip_from].count += 1;
        location[ip_from].update_at = result.date;
      }

      if(req.query.clear) location = {}; //clear location data

      fs.writeFile(file_path, JSON.stringify(location), 'utf-8');
      res.render('location.html',{});
    });

    articles_rotue(app);
    compile_rotue(app);
};
