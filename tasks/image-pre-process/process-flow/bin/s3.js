var AWS = require('aws-sdk');
var Promise = require('bluebird');
var _ = require('lodash');
var events = require('events');

var s3 = new AWS.S3();

module.exports = function(bucket, limit, prefix, lastKey) {
  // store all objects
  var objects = [];

  limit || (limit = 1000);

  // indicate fetching status
  var fetchingStatus = {
    done: false,
  };

  var listEvent = new events.EventEmitter();

  var partialFetched = function(data) {
    var contents = (data || {}).Contents;

    listEvent.emit('keys', {
      done: false,
      contents: contents,
    });
  }

  var allFetched = function(data) {
    var contents = (data || {}).Contents;

    listEvent.emit('keys', {
      done: true,
      contents: contents,
    });

    listEvent.emit('done', {
      contents: contents
    });
  }

  var emitError = function(err) {
    listEvent.emit('error', {
      err: error,
    })
  }


  var fetchKeys = function() {
    var params = _.extend({
      MaxKeys: limit,
      Bucket: bucket,
    }, params);

    if (typeof lastKey === 'object' && lastKey.Key) {
      _.extend(params, {StartAfter: lastKey.Key});
    }

    if (prefix) {
      _.extend(params, {Prefix: prefix});
    }

    s3.listObjectsV2(params, function(err, data) {
      if (!data) {
        allFetched(data);
        return;
      }

      if (err) {
        emitError(err);
      }

      // if contents length larger than 999
      // then may be more resource exists
      if (data.Contents.length >= limit) {
        // partial content
        partialFetched(data);
        lastKey = _.last(data.Contents);
        fetchKeys();
      } else {
        allFetched(data);
      }
    });
  };

  fetchKeys();

  return listEvent;
}
