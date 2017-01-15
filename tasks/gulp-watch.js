var stylus = require('stylus');
var changed = require('gulp-changed');
var cache = require('gulp-cached');
var progeny = require('gulp-progeny');
var Q = require('q');
var gulpStylus = require('gulp-stylus');
var gulpif = require('gulp-if');
var merge = require('merge-stream');
var spritesmith = require('gulp.spritesmith');
var _ = require('lodash');
// NOTE
// gulp watch 4.2.5 works fine, but 4.3.5 will always crash
var watch = require('gulp-watch');
//use for livereload
var browserSync = require('browser-sync').create();

var watchTaskConfig = {
  stylus: {
    watch: true,
    tasks: ['compile-stylus'],
    paths: ['assets/styles/**/*.styl', '!assets/styles/bootstrap/**', '!assets/styles/base/**', '!assets/styles/share/**'],
    dest: '.tmp/public/styles',
  },
  styles: {
    watch: true,
    tasks: ['compile-styles'],
    paths: ['assets/styles/**/*.css'],
    dest: '.tmp/public/styles',
  },
  scripts: {
    // use pipe(watch(dest)) instead of watch all changes
    watch: false,
    tasks: ['compile-scripts'],
    paths: ['assets/scripts/**/*'],
    dest: '.tmp/public/scripts',
  },
  images: {
    watch: true,
    tasks: ['compile-images'],
    paths: ['assets/images/**/*.{png,jpg,gif,ico,svg}', '!assets/images/sprites/**/*'],
    dest: '.tmp/public/images',
  },
  fonts: {
    watch: true,
    tasks: ['compile-fonts'],
    paths: ['assets/fonts/**/*.{eot,otf,svg,ttf,woff,woff2}'],
    dest: '.tmp/public/fonts',
  },
};

// error handler
var handleError = function handleError(err) {
  console.log(err.toString());
  this.emit('end');
}


/********************************************
 *
 * NOTE: this file has been updated for optimization
 * images, fonts, sprites has not been optimized
 * you should reload page manually after modified
 *
 ********************************************/
module.exports = function (gulp) {
  var timer = null;
  var isEnv = !settings.publish;

  // start watch task
  gulp.task('watch', function () {
    var config, configName;
    if(!settings.disabled_browser_sync){
      gulp.start('browser-sync');
    }

    _.each(watchTaskConfig, function (config, name) {
      console.log('config: ', config);
      if (config.watch) {
        watch(config.paths, function () {
          gulp.start(config.tasks);
        });
      } else {
        gulp.start(config.tasks);
      }
    });
  });

  gulp.task('browser-sync', function () {
    browserSync.init({
      port: 1338,
      proxy: 'http://localhost:3000',
      reloadDelay: 500,
      reloadDebounce: 2000,
    });
  });

  gulp.task('auto', [
    'compile-sprites',
    'compile-stylus',
    'compile-styles',
    'compile-scripts',
    'compile-images',
    'compile-fonts'
  ]);

  gulp.task('compile-stylus', function (e) {
    return gulp.src(watchTaskConfig.stylus.paths)
      .pipe(cache('stylus'))
      .pipe(progeny())
      .pipe(gulpStylus({
        'include css': true
      }))
      .on('error', handleError)
      .pipe(changed(watchTaskConfig.stylus.dest, {hasChanged: changed.compareSha1Digest}))
      .pipe(gulp.dest(watchTaskConfig.stylus.dest))
      .pipe(gulpif(isEnv, browserSync.stream()))
      .on('error', handleError);
  });

  gulp.task('compile-styles', function () {
    return gulp.src(watchTaskConfig.styles.paths)
      .pipe(cache('styles'))
      .pipe(changed(watchTaskConfig.styles.dest, {hasChanged: changed.compareSha1Digest}))
      .pipe(gulp.dest(watchTaskConfig.styles.dest))
      .pipe(gulpif(isEnv, browserSync.stream()))
      .on('error', handleError);
  });

  gulp.task('compile-scripts', function () {
    return gulp.src(watchTaskConfig.scripts.paths)
      //线上环境，或者编译时，不能 watch
      .pipe(gulpif(isEnv, watch(watchTaskConfig.scripts.paths)))
      .pipe(gulp.dest(watchTaskConfig.scripts.dest))
      .pipe(gulpif(isEnv, browserSync.stream()))
      .on('error', handleError);
  });

  gulp.task('compile-images', function () {
    return gulp.src(watchTaskConfig.images.paths)
      .pipe(gulp.dest(watchTaskConfig.images.dest))
      .on('error', handleError);
  });

  gulp.task('compile-fonts', function () {
    return gulp.src(watchTaskConfig.fonts.paths)
      .pipe(gulp.dest(watchTaskConfig.fonts.dest))
      .on('error', handleError);
  });


  // 第一次还是要手动执行……
  gulp.task('compile-sprites', function () {
    var spriteData = gulp.src('assets/images/sprites/*.png')
      .pipe(spritesmith({
        retinaSrcFilter: 'assets/images/sprites/*@2x.png',
        imgName: 'sprite.png',
        imgPath: '/images/sprites/sprite.png',
        retinaImgName: 'sprite@2x.png',
        retinaImgPath: '/images/sprites/sprite@2x.png',
        cssName: 'sprite.css',
        padding: 2
      }))
      .on('error', handleError);

    var imgStream = spriteData.img
      .pipe(gulp.dest('.tmp/public/images/sprites'))
      .on('error', handleError);
    var cssStream = spriteData.css
      .pipe(gulp.dest('assets/styles/sprites'))
      .on('error', handleError);

    return merge(imgStream, cssStream);
  });
};
