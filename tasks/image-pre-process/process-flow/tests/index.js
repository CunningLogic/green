var compileAll = require('../index');
// var bucket = 'lambda-test-abram';
var bucket = 'dbeta-me';
var prefix = 'assets/images';

compileAll(bucket, prefix, true);
