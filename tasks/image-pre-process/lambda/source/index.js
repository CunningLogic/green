'use strict';

const distribute = require('./utils/distribute');

exports.handler = function(event, context) {

  distribute(event)
  .then(res => {
    console.log('uploaded Successfully!');
    context.succeed(res);
  })
  .catch(err => {
    console.log('unable to transform images');
    context.fail(err);
  });
}
