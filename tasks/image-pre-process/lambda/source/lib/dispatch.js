'use strict';

const Promise = require('bluebird');
const utils = require('../utils/utils');
const config = require('../config/');

const convert = require('../lib/convert');
const compress = require('../lib/compress');

/***************************************************************
*
*  convert series buffers to specific format depens on config
*  @param {buffers[]|buffer} the buffer(s) will be converted
*  @return {promises[]} the convertion buffers
*
****************************************************************/
const Dispatch = {
  // get config
  loadTypes(type) {
    return config.rules[type];
  },

  // get should be compressed quality
  loadQuality() {
    return config.quality.concat([config.originQuality]);
  },

  /********************************
  * conver buffers to specific type
  * and append meta data to process info
  * @param  {wrappedBuffer} wrappedBuffer will be converted buffer
  *********************************/
  convert(wrappedBuffer) {
    const originInfo = wrappedBuffer.originInfo;
    const types = Dispatch.loadTypes(originInfo.type);

    if (!types) {
      throw Error('no types found');
    }

    return types.map(type => {
      return convert(wrappedBuffer, type);
    });
  },

  compress(wrappedBuffer) {
    const originInfo = wrappedBuffer.originInfo;
    const qualities = Dispatch.loadQuality();

    if (!qualities) {
      throw Error('no quality configured');
    }

    return qualities.map(quality => {
      return compress(wrappedBuffer, quality);
    });
  }
};

module.exports = Dispatch;
