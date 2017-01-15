'use strict';

const fs = require('fs');
const sharp = require('sharp');
const Promise = require('bluebird');
const utils = require('../utils/utils');

/******************************************************************************
*
*  compress image
*  @author abram
*  @param {buffer} source  - the image will be compressed
*  @param {number} quality - the result quality of compress
*  @param {string?} type - the compress type
*  @return {buffer} - the result that be compressed image
*
*******************************************************************************/

/******************************************************
*
*  very thanks for this article:
*  https://www.smashingmagazine.com/2015/06/efficient-image-resizing-with-imagemagick/
*  it very helpful
*
*******************************************************/

const convertJPG = function convertJPG(buffer, quality) {
  return sharp(buffer)
  .quality(quality)
  .progressive()
  .jpeg()
  .toBuffer();
}

const convertPNG = function convertPNG(buffer, quality) {
  const compressionLevel = 10 - Math.floor(quality / 10);

  return sharp(buffer)
  .compressionLevel(compressionLevel)
  .progressive()
  .png()
  .toBuffer();
}

const convertWebP = function convertWebP(buffer, quality) {
  return sharp(buffer)
  .quality(quality)
  .progressive()
  .webp()
  .toBuffer();
}

module.exports = function compress(wrappedBuffer, quality) {
  const processInfo = wrappedBuffer.processInfo;
  const originInfo = wrappedBuffer.originInfo;
  const buffer = wrappedBuffer.buffer;

  const type = wrappedBuffer.processInfo.type;
  // let type = 'Lossless';
  //
  // if ((originInfo.type || '').toLowerCase() === 'jpeg') {
  //   type = 'jpeg';
  // }
  // gm convert myImage.png +dither -depth 8 -colors 50 myImage.png


  return new Promise((resolve, reject) => {
    let convertion;

    switch (type) {
      case 'jpeg':
      convertion = convertJPG(buffer, quality);
      break;
      case 'png':
      convertion = convertPNG(buffer, quality);
      break;
      case 'webp':
      convertion = convertWebP(buffer, quality);
      break;
      default:
      throw Error('what do you want to do?');
    }

    const newProcessInfo = Object.assign({}, processInfo, {
      quality: quality
    });

    convertion.then(compressedBuffer => {
      const compressResult = Object.assign({}, wrappedBuffer, {
        buffer: compressedBuffer,
        processInfo: newProcessInfo,
      });

      resolve(compressResult);
    }).catch(err => {
      reject(err);
    });
  });
}
