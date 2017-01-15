var gulp = require('gulp');
var compileAll = require('./image-pre-process/process-flow/');

module.exports = function(gulp, argv) {
  gulp.task('optimize-images', function() {
    var bucket = 'dji-www';
    compileAll(bucket);
  });
}
