'use strict';

const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const utils = require('../utils/utils');
const path = require('path');

const dest = './dest/';
const source = './source/new/';
// const source = './source/phantom4/';

const compress = require('../lib/compress');
const convert = require('../lib/convert');

const transform = require('../bin/transform');

// load current directory
fs.readdirAsync(source).then(dirs => {
  let currentIndex = 0;
  let reduces = [];
  let totalSize = 0;
  let totalReduced = 0;
  const processStartTime = (new Date()).getTime();

  const imagePaths = dirs.filter(dir => {
    return utils.isImagePath(dir);
  });

  const transformBuffer = function(index) {
    if (index >= imagePaths.length) {
      console.log('transform completed.');
      let count = reduces.length;
      const reducedDetails = {};
      // caculate total reduced size
      reduces.forEach((item, index) => {
        item.forEach((reduce, index) => {
          if (!reducedDetails[reduce.format + ',' + reduce.quality]) {
            reducedDetails[reduce.format + ',' + reduce.quality] = reduce.reduced;
          } else {
            reducedDetails[reduce.format + ',' + reduce.quality] += reduce.reduced;
          }
        });
      }, 0)
      const processStopTime = (new Date()).getTime();

      console.log('total transformed: ', imagePaths.length + ' files');
      console.log('total size: ', totalSize + ' bytes (', parseFloat(totalSize / 1024 / 1024).toFixed(4) + 'Mb)');
      console.log('total duration: ', processStopTime - processStartTime + 'ms');
      console.log('reduced details: ');
      Object.keys(reducedDetails).forEach(type => {
        console.log('reduced size: ', reducedDetails[type]);
        const item = type.split(',');
        const reducedPercent = parseFloat(reducedDetails[type]/ totalSize * 100).toFixed(2);
        console.log('format: ', item[0], ', quality: ', item[1] + '%, reduced: ', reducedPercent + '%');
      });
      // console.log('reduced avg: ', totalReduced / count + '%');
      return;
    }

    const imagePath = path.resolve(source, imagePaths[index]);
    return fs.readFileAsync(imagePath).then(buffer => {

      const source = imagePaths[index];

      const trs = transform(buffer, source);

      const startTime = (new Date()).getTime();
      console.log('file loaded from ', source);
      totalSize += buffer.length;

      trs.then(transformedBuffers => {
        const finishedTime = (new Date()).getTime();
        console.log('transform duration: ', finishedTime - startTime + 'ms');
        let reducedSize = 0;
        const singleReduces = [];
        let reducedCount = 0;

        reduces.push(transformedBuffers.map(item => {
          return {
            format: item.processInfo.type,
            quality: item.processInfo.quality,
            reduced: buffer.length - item.buffer.length,
          };
        }));

        const saves = transformedBuffers.map(wrappedBuffer => {
          const processInfo = wrappedBuffer.processInfo;
          const originInfo = wrappedBuffer.originInfo;
          const filename = utils.resolveName(originInfo, processInfo);
          singleReduces.push({
            type: processInfo.type,
            reducedSize: buffer.length - wrappedBuffer.buffer.length,
          });

          ++ reducedCount;

          // return Promise.resolve();

          const savePath = path.resolve(dest, filename);

          return fs.writeFileAsync(savePath, wrappedBuffer.buffer)
          .then(() => {
            // console.log('successful!');
          }).catch(err => {
            console.log('file write failed.', err);
          });
        });

        Promise.all(saves).then(() => {
          ++ currentIndex;
          transformBuffer(currentIndex);
        });

        // console.log('reduces: ', singleReduces);

        // console.log('reduced size: ', reducedSize);
        // const reducedPercent = parseFloat(reducedSize / (buffer.length * reducedCount) * 100).toFixed(4) + '%';
        // console.log('reduced: ', reducedPercent);
      }).catch(err => {
        console.log('transformation error: ', err);
      });
    }).catch(err => {
      console.log('read file failed: ', err);
    });
  }

  transformBuffer(currentIndex);
});
