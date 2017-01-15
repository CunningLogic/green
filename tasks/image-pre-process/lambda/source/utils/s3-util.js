/***********************************
*
*  AWS S3 operation
*
*
************************************/
'use strict';

const AWS = require('aws-sdk');
const util = require('util');
const Promise = require('bluebird');
const path = require('path');

// get reference to S3 client
var s3 = new AWS.S3();

module.exports = {
  getEventInfo(event) {
    const record = event.Records[0];
    const s3 = record.s3;

    return {
      // Object key may have spaces or unicode non-ASCII characters.
      srcKey: decodeURIComponent(s3.object.key.replace(/\+/g, " ")),
      srcBucket: s3.bucket.name,
    };
  },

  assembleTargetKey(srcKey, filename) {
    let dirname = path.dirname(srcKey);
    if (dirname === '.') {
      dirname = '';
    }
    return (dirname ? dirname + '/' : '') + filename;
  },

  getObject(srcBucket, srcKey) {
    return new Promise((resolve, reject) => {
      console.log('get object from bucket: ', srcBucket);
      console.log('object key: ', srcKey);
      s3.getObject({
        Bucket: srcBucket,
        Key: srcKey
      }, (err, response) => {
        console.log('get object: ', err);
        if (err) {
          reject(err);
        } else {
          resolve(response);
        }
      });
    });
  },

  upload(Bucket, Key, data) {
    if (!Bucket || !Key || !data || (typeof data !== 'object')) {
      throw Error('Incorrect params');
    }

    const param = Object.assign({
      Bucket: Bucket,
      Key: Key
    }, data);

    console.log('upload files to : ', Bucket);
    console.log('with param : ', param);

    return new Promise((resolve, reject) => {
      s3.putObject(param, (err, response) => {
        console.log('uploaded err: ', err);
        console.log('uploaded response: ', response);
        if (err) {
          reject(err);
        } else {
          resolve(response);
        }
      });
    });
  },
};;
