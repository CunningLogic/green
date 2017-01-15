var path = require('path');

var revAll = require('gulp-rev-all'); //MD5更改文件名
var rev = require('gulp-rev'); //MD5更改文件名,gulp-rev和gulp-rev-all类似,貌似gulp-rev-collector是基于gulp-rev而来
var revCollector = require('gulp-rev-collector'); //将manifests.json的中生成MD5后的的文件名,替换到html模板中

var awspublish = require('gulp-awspublish');
var uglify = require('gulp-uglify'); //js压缩,
var csso = require('gulp-csso'); //css压缩,
var minifyHTML = require('gulp-minify-html'); //html压缩
var filter = require('gulp-filter'); //在 vinyl流中过滤文件.
var through = require('through-gulp');
var Q = require('q');

var urlModify = require('gulp-modify-css-urls');
var useref = require('gulp-useref'); //将html中注释部分的路径替换

var watch = require('gulp-watch');

module.exports = function(gulp,argv) {
    /***
     * assets task
     *
     * run like - gulp build --assets all
     * build assets to static
     * use: https://github.com/sindresorhus/gulp-filter
     * ***/

    gulp.task('assets', function() {
        var jsFilter = filter("**/*.js", {
            restore: true
        });
        var cssFilter = filter("**/*.css", {
            restore: true
        });
        var htmlFilter = filter('**/*.html', {
            restore: true
        });

        return gulp.src(['assets/**'])
            //===压缩js
            .pipe(jsFilter)
            .pipe(uglify())
            .pipe(jsFilter.restore)

        //===压缩css
        .pipe(cssFilter)
            .pipe(csso())
            .pipe(cssFilter.restore)

        //======== 压缩 html
        .pipe(htmlFilter)
            .pipe(minifyHTML({
                empty: true,
                spare: true
            }))
            .pipe(htmlFilter.restore)
    });

    /***
     * 给静态资源名添加MD5,并生成rev-manifest.json文件
     * {read:false} 不去读文件,加快程序
     *
     * use: https://github.com/sindresorhus/gulp-rev
     * ***/
    gulp.task('md5', function() {
        // by default, gulp would pick `assets/css` as the base,
        // so we need to set it explicitly:
        var rev = new revAll({
            hashLength: 32,
            transformFilename: function(file, hash) {
                var ext = path.extname(file.path);
                return path.basename(file.path, ext) + "-" + hash + ext; //filename-hash.ext
            }
        });
        var assets_config = argv.config,
            products = argv.products,
            assets_source=['.tmp/public/styles/**/*','.tmp/public/scripts/**/*', '.tmp/public/images/**/*'];
        if(assets_config){
          assets_source=[
            '.tmp/public/images/where-to-buy/**/*',
            '.tmp/public/images/where-to-buy/store-cover/**/*',
            '.tmp/public/styles/where-to-buy/**/*',
            '.tmp/public/scripts/libs/**/*',
            '.tmp/public/scripts/bus/where-to-buy/**/*',
            '.tmp/public/images/compare/**/*',
            '.tmp/public/images/menu/*',
            '.tmp/public/styles/compare/*',
            '.tmp/public/styles/fonts/**.*',
            '.tmp/public/scripts/bus/remote/**.*'
            //'.tmp/public/styles/products/**/*.css',
            //'.tmp/public/scripts/bus/products/**/*.js',
            //'.tmp/public/images/lightbridge-2/**/*',
            //'.tmp/public/images/zenmuse-x5s/**/*'
          ];
        }
        if(products){
          products = products.split(',');
          assets_source.push('.tmp/public/styles/products/**/*.css');
          assets_source.push('.tmp/public/scripts/bus/products/**/*.js');
          products.map(function(product){
            assets_source.push('.tmp/public/images/'+product+"/**/*");
          });
        }

        return gulp.src(assets_source)
            //.pipe(gulp.dest('build/static'))
            .pipe(rev.revision())
            .pipe(gulp.dest('build/assets'))
            .pipe(rev.manifestFile())
            .pipe(gulp.dest('build/assets'));
    });

    /***
     * 更改html中静态资源路径
     *
     * use: https://github.com/sindresorhus/gulp-rev
     * ***/
    gulp.task('rev', function() {
        var locale = 'en',
            manifest = {},
            source = 'build/static/origin/{path}/**/*.html',
            path = argv.path;
        source = source.replace('{path}/',path ? "**/"+path+"/":'');// 'build/static/origin/**/lightbridge.html';

        //========rewrite html assets url
        return gulp.src(['build/assets/rev-manifest.json',source])
            .pipe(through.map(function (file) {
               if(file.path.has('/cn/')) locale='zh-CN';
               return file;
             }))
            .pipe(revCollector({
                revSuffix: '-[0-9a-f]{8,64}-?',
                replaceReved: true,
                dirReplacements: {
                    '/': function(src) {
                        var cdn_host = settings.cdn[settings.env].host(src);
                        return cdn_host + '/assets/' + src;
                    }
                }
            }))
            //.pipe( minifyHTML({
            //    empty:true,
            //    spare:true
            //}) )
            .pipe(gulp.dest('build/static/' + settings.env))
            .on('end',function(){
                var cdn_host = settings.cdn[settings.env].host(url);
                gulp.src('build/assets/styles/where-to-buy/where-to-buy-c030dfd3f413ccc620c1c87878ab311f.css')
                .pipe(urlModify({
                  modify: function (url, filePath) {
                    console.log(url);

                    if(url.has('//')||url.has('http')) return url;
                    url = url.replace(/(\..\/)*/g,'');
                    return cdn_host+"/assets"+ url;
                  }
                }))
                //.pipe(csso())
                .pipe(gulp.dest('build/assets/styles/where-to-buy'));
            });
    });


    /***
     * 发布静态资源到CDN
     *
     * use: https://github.com/pgherveou/gulp-awspublish
     * ***/
    var rename = require("gulp-rename");
    var parallelize = require("concurrent-transform");
    var fs = require('fs');

    gulp.task('publish-upload',function(){
       var manifest = {};
       return gulp.src(argv.path)
         .pipe(through.map(function (file) {
            var path = file.path.replace(process.cwd()+'/assets/','');
            manifest[path] = path;
         })).on('finish',function(err,file){
            var content = JSON.stringify(manifest);
            fs.writeFileSync(process.cwd()+"/build/assets/rev-manifest.json",content,'utf-8');
            gulp.start('publish-cdn');
         });
    });

    gulp.task('publish-cdn', function() {
        var deferred = Q.defer();

        var manifest = {};
        // create a new publisher using S3 options
        // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#constructor-property
        var publisher = awspublish.create({
            params: {
              "Bucket": argv.env=='production'?'all-dji-com':'dbeta-me',
              "accessKeyId": "AKIAISF5ZRFWAUTMB3PQ",
              "secretAccessKey": "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",
              "region": "us-west-1"
            }
        });
        console.log('-----md5 env ---->'+ argv.env);
        console.log('-----md5 bucket---->'+ (argv.env=='production'?'all-dji-com':'dbeta-me') );
        //生成环境上保存权限文档，先说明文档(readme.md),然后配置:$ vi ~/.aws/credentials 才可以修改
        //var credentials = new AWS.SharedIniFileCredentials();
        //AWS.config.credentials = credentials;
        //var publisher = awspublish.create(credentials);

        // define custom headers
        var headers = {
            'Cache-Control': 'max-age=315360000, no-transform, public'
        };
        gulp.src('build/assets/rev-manifest.json').on('data', function(file) {
            var ext = path.extname(file.path);
            if (ext === '.json') {
                try {
                    var content = file.contents.toString('utf8');
                    if (content) {
                        manifest = JSON.parse(content);
                    }
                } catch (e) {
                    console.error(e);
                }
            }
        }).on('end', function() {
            var cdn_files = []; //需要上传的文件
            for (var k in manifest) {
                if (manifest.hasOwnProperty(k))
                    cdn_files.push("assets/" + manifest[k]);
            }

          console.log(cdn_files);

            return gulp.src(cdn_files, {
                    base: 'assets/'
                })
                // gzip, Set Content-Encoding headers and add .gz extension
                //.pipe(awspublish.gzip())
                //.pipe(awspublish.gzip({ ext: '.gz' }))w

            .pipe(rename(function(path) {
                    return path;
                }))
                // publisher will add Content-Length, Content-Type and headers specified above
                // If not specified it will set x-amz-acl to public-read by default
                //开启多文件并行发布
                .pipe(parallelize(publisher.publish(headers), 100))
                // create a cache file to speed up consecutive uploads
                .pipe(publisher.cache())
                // ---------------
                // 删除旧的,发布新的,（使用，请注意下面的警告）
                // {warning},sync will delete files in your bucket that are not in your local folder.
                //.pipe(publisher.sync())
                // ----------------
                // print upload updates to console
                .pipe(awspublish.reporter({
                    states: ['create', 'update', 'delete']
                }))
                .on('finish', function() {
                    console.log('finish...');
                });
        });

      return deferred.promise;
    });
};
