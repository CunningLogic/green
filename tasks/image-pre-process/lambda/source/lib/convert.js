'use strict';

const fs = require('fs');
const sharp = require('sharp');
const path = require('path');
const mime = require('mime-types');
const utils = require('../utils/utils');
const Promise = require('bluebird');
const config = require('../config/');

/******************************************************************************
*
*  convert image format
*  depends on image format, only origin format and webp will be generated
*  @author abram
*  @param {object} wrappedBuffer  - the image will be converted
*  @param {string} type - the type will be converted to
*  @return {promise} - the converted result
*
*******************************************************************************/

module.exports = function convert(wrappedBuffer, type) {
  const originInfo = wrappedBuffer.originInfo;
  const processInfo = wrappedBuffer.processInfo;
  const newProcessInfo = Object.assign({}, processInfo, {
    type: type,
  });

  return new Promise((resolve, reject) => {
    resolve(Object.assign({}, wrappedBuffer, {
      processInfo: newProcessInfo,
    }));
  });
}
