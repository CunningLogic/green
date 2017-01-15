'use strict';

const Promise = require('bluebird');
const transform = require('../bin/transform');
const utils = require('../utils/utils');
const S3Util = require('../utils/s3-util');
const config = require('../config/');
const util = require('util');

module.exports = function(event, context) {
  const S3Info = S3Util.getEventInfo(event);
  // Read options from the event.
  console.log("Reading options from event:\n", util.inspect(event, {depth: 5}));

  const srcBucket = S3Info.srcBucket;
  const srcKey = S3Info.srcKey;
  const destBucket = config.destBucket[srcBucket];

  if (!destBucket) {
    console.error('Source bucket is unsupported for now.');
    return;
  }

  // Sanity check: validate that source and destination are different buckets.
  if (srcBucket == destBucket) {
    console.error("Destination bucket must not match source bucket.");
    return;
  }

  if (!utils.isAccessedKey(srcKey)) {
    console.error('unable to infer image type for key ' + srcKey);
    return;
  }

  let ContentType = null;

  // if file just need copy, then copy it to dest path
  // else, transform it and upload
  if (utils.isCopyItems(srcKey)) {
    const targetKey = srcKey;

    console.log('copy items, dont need to transform.');

    return S3Util.getObject(srcBucket, srcKey)
    .then(response => {
      ContentType = response.ContentType;
      const buffer = response.Body;

      console.log('got object: ', response);
      if (! buffer instanceof Buffer) {
        throw Error('this program expected of buffer, ',typeof buffer + ' got!');
      }

      return S3Util.upload(
        destBucket,
        targetKey,
        {
          Body: buffer,
          ContentType: ContentType,
        }
      );
    });
  } else {
    // download from S3 bucket
    return S3Util.getObject(srcBucket, srcKey)
    .then(response => {
      ContentType = response.ContentType;
      const buffer = response.Body;

      console.log('got object: ', response);
      if (! buffer instanceof Buffer) {
        throw Error('this program expected of buffer, ',typeof buffer + ' got!');
      }

      // transform buffers
      return transform(buffer, srcKey);
    })
    .then(transformedBuffers => {
      // upload result to dest buckets
      return Promise.all(transformedBuffers.map(wrappedBuffer => {
        const processInfo = wrappedBuffer.processInfo;
        const originInfo = wrappedBuffer.originInfo;
        const filename = utils.resolveName(originInfo, processInfo);
        const targetKey = S3Util.assembleTargetKey(srcKey, filename);

        return S3Util.upload(
          destBucket,
          targetKey,
          {
            Body: wrappedBuffer.buffer,
            ContentType: ContentType,
          }
        );
      }));
    });
  }
};
