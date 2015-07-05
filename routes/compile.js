/**
 * Created by panhongfei on 15/5/31.
 * /compile/photo
 */

module.exports=function(app){
    var gulp = require('gulp'),
        concat = require('gulp-concat'),
        uglify = require('gulp-uglify'),
        path = require('path'),
        compiler= require('../helper/compiler.js');

    app.route('/compile/:dir')
        .get(function(req,res){
            var dir=req.params.dir,
                dep={};
            if(dir){
                compiler(dir,function(dep,err){
                    if(err){
                        res.json({success:false,status:'400',error:err});
                    }else if(dep){
                        gulp.src(dep.list)
                            .pipe(concat(dir+"-min.js"))
                            .pipe(uglify())
                            .pipe(gulp.dest(path.join(dep.bus,'build')));
                        res.json({success:true,status:'200',dir:dir});
                    }
                });
            }
        })
        .post(function(req,res){

        });
};