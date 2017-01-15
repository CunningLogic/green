var s3Fetch = require('./bin/s3');
var lambda = require('./bin/lambda');
var utils = require('./utils/');
var logger = require('./utils/logger');
var _ = require('lodash');
var CLI = require('clui');
var clc = require('cli-color');

var LIMIT = 100;

var Spinner = CLI.Spinner;

var startJob = function(bucket, prefix, lastKey) {
  console.log('bucket: ', bucket);
  console.log('prefix: ', prefix);
  console.log('lastkey: ', lastKey);

  var fetch = s3Fetch(bucket, LIMIT, prefix, lastKey);

  var lastObject;
  var invokeTimeStamp = new Date();
  var fetchDone = false;
  var allDone = false;
  var successedCount = 0;
  var objectsCount = 0;
  var failedObjects = [];


  // this program will retry 3 times
  var retryCount = 0;

  // count spinner
  var countdown = new Spinner('starting jobs...');
  countdown.start();

  var logged = false;

  var writeLog = function(data) {
    return logger.write(data);
  };

  var exitProcess = function() {
    console.log('saving log...');
    writeLog({
      bucket: bucket,
      prefix: prefix,
      failedObjects: failedObjects,
      lastObject: lastObject,
      fetchDone: fetchDone,
      allDone: allDone,
    })
    .then(function() {
      process.stdout.write('\n');
      process.stdout.write('log saved.');
      process.stdout.write('\n');
      process.exit();
    })
    .catch(function(err) {
      process.stdout.write('\n');
      process.stdout.write('log save failed: ', err);
      process.stdout.write('\n');
      process.exit();
    });
  };

  var logJob = function() {
    var args = Array.prototype.slice.apply(arguments);
    var message = args.join(' ');

    countdown.message(message);
  };

  var jobFinished = function (canceled) {
    process.stdout.write('\n');
    var message = 'job finished';
    if (canceled) {
      message = 'job canceled';
    }
    console.log(message);
    process.stdout.write('\n');
    console.log('job summary: fetched %s items, success %s items, failed %s items', objectsCount, successedCount, failedObjects.length);

    // if failed keys exists and retry count less than 4
    // then retry
    if (failedObjects.length > 0 && retryCount < 4) {
      console.log('retrying failed keys..., the ' + retryCount + ' time');
      lambda.invoke(bucket, failedObjects);
      failedObjects = [];
      ++ retryCount;
    } else {
      console.log('exiting.');
      exitProcess();
    }
  }

  var jobChanged = function(data) {
    if (data.success) {
      ++ successedCount;
      lastObject = data.item;
    } else {
      failedObjects.push(data.item);
    }

    logJob('finished: ' + successedCount + '/' + failedObjects.length + '/' + objectsCount);

    if (fetchDone && ((successedCount + failedObjects.length) === objectsCount)) {
      allDone = true;
      jobFinished();
    }
  }

  // logger.read()
  // .then(function(log) {
  //   // console.log('log: ', log);
  // })
  // .catch(function(err) {
  //   // console.log('error: ', err);
  // });

  fetch.on('keys', function(data) {
    var newObjects = utils.filterKeys(data.contents);
    objectsCount += newObjects.length;

    // filter keys
    lambda.invoke(bucket, newObjects);
  });

  fetch.on('done', function(data) {
    console.log('fetch finished');

    fetchDone = true;

    // if result is empty, then exit process immediately
    if (objectsCount === 0) {
      jobFinished();
    }
  });

  fetch.on('error', function(err) {
    // write logger when error occured
    // console.log('fetch error occured: ', err);
    // writeLog();
  });

  lambda.events.on('change', function(data) {
    jobChanged({
      success: true,
      item: data.item,
    });
  });

  lambda.events.on('error', function(err) {
    // write logger when error occured
    // console.log('invoke error occured: ', err);
    jobChanged({
      success: false,
      item: err.item,
    });
    // writeLog();
  });

  process.stdin.resume();
  // // do something when node process was exited
  process.on('SIGINT', jobFinished.bind(null, true));
}

module.exports = function(bucket, prefix, restore) {
  if (!bucket) {
    throw new Error('no bucket specified');
  }

  if (restore) {
    logger.read()
    .then(function(data) {
      var lastObject = {};
      if (!data.allDone) {
        console.log('restored from last successed object.');
        failedObjects = data.failedObjects || [];
        lastObject = (data.lastObject || [])[0];
        startJob(bucket, prefix, lastObject);
      } else {
        startJob(bucket, prefix);
      }
    })
    .catch(function(error) {
      console.log('error occured. ', error);
    });
  } else {
    startJob(bucket, prefix);
  }
}
