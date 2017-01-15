'use strict';

const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));

const utils = require('../utils/utils');
const Dispatch = require('../lib/dispatch');

module.exports = function(buffer, key) {
  const fileInfo = utils.getFileInfo(key);

  // a processing object contains propertys as below
  // buffer, origin: {name, ext, type}, process: {quality, type}
  // wrap file
  const wrappedBuffer = utils.wrapBuffer(buffer, fileInfo);
  const convertions = Dispatch.convert(wrappedBuffer);

  return Promise.all(convertions)
  .then(processedBuffers => {
    const compressions = processedBuffers.map(processedBuffer => {
      return Dispatch.compress(processedBuffer);
    });

    return Promise.all(utils.flattenArray(compressions));
  });
}
