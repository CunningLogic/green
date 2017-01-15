var _ = require('lodash');
var AWS = require('aws-sdk');
var Promise = require('bluebird');
var events = require('events');

var lambda = new AWS.Lambda({
  region: 'us-east-1'
});

var assembleEvent = function(bucket, object) {
  if (!bucket) {
    throw Error('no bucket');
  }

  // it omit series props
  var Event = {
    Records: [
      {
        "eventVersion": "2.0",
        "eventSource": "aws:s3",
        "awsRegion": "us-west-2",
        "s3": {
          "bucket": {
            "name": bucket,
            "ownerIdentity": {
              "principalId": "A3NL1KOZZKExample"
            },
            "arn": "arn:aws:s3:::" + bucket
          },
          "object": {
            "key": object.Key,
            "size": object.Size / 1000,
            "eTag": object.ETag,
            "versionId": "096fKKXTRTtl3on89fVO.nfljtsv6qko"
          }
        }
      }
    ]
  };

  return JSON.stringify(Event);
}

var allObjects = [];
var invokeEvents = new events.EventEmitter();

var Lambda = {
  events: invokeEvents,

  running: false,

  pushObjects: function(objects) {
    allObjects = allObjects.concat(objects);
  },

  invoke: function(bucket, objects) {
    if (!Array.isArray(objects) && allObjects.length === 0) {
      throw new Error('objects must be array');
    }

    allObjects = allObjects.concat(objects);

    Lambda.running = true;

    _.forEach(objects, function(item) {
      var Event = assembleEvent(bucket, item);
      var params = {
        FunctionName: 'OptimizeImages',
        InvocationType: 'Event',
        Payload: Event,
      };

      lambda.invoke(params, function(err, data) {
        if (err) {
          return Lambda.invokeError(err, item);
        }

        if (data.StatusCode === 202) {
          Lambda.partFinished(item);
        } else {
          Lambda.invokeError(err, item);
        }
      });
    });
  },

  partFinished: function(item) {
    allObjects.splice(allObjects.indexOf(item), 1);
    invokeEvents.emit('change', {
      item: item,
    });
  },

  invokeError: function(err, item) {
    allObjects.splice(allObjects.indexOf(item), 1);
    invokeEvents.emit('error', {
      error: err,
      item: item,
    });
  },
};

module.exports = Lambda;
