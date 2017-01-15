'use strict';
const mime = require('mime-types');
const path = require('path');
const config = require('../config/');

const utils = {
  getType: function(sourcePath) {
    let type = null;
    if (!sourcePath) return null;

    const mimeType = mime.lookup(sourcePath);

    if (mimeType) {
      type = mimeType.split('/')[1];
    }

    return type;
  },

  getExtension: function(sourcePath) {
    let ext = mime.extension(mime.lookup(sourcePath));
    if (ext === 'jpeg') {
      ext = 'jpg';
    }
    return ext;
  },

  isAccessedKey: function(sourcePath) {
    const accessedKeys = config.accessedImageTypes.slice().concat(config.copyItems);
    const ext = utils.getExtension(sourcePath);

    return accessedKeys.indexOf(ext) > -1;
  },

  resolveName: function(originInfo, processInfo) {
    if (processInfo.quality === config.originQuality) {
      return originInfo.name + '.' + utils.getExtension(processInfo.type);
    } else {
      return originInfo.name + '_' + processInfo.quality + '.' + utils.getExtension(processInfo.type);
    }
  },

  isCopyItems: function(key) {
    var ext = utils.getExtension(key);
    return config.copyItems.indexOf(ext) > -1;
  },

  getName: function(sourcePath) {
    let filename = null;
    let basename = path.basename(sourcePath);
    if (basename) {
      basename = basename.split('.');
      basename.splice(-1, 1);
      filename = basename.join('.');
    }

    return filename;
  },

  getPath: function(sourcePath) {
    return path.dirname(sourcePath);
  },

  getFileInfo: function(source) {
    return {
      path: utils.getPath(source),
      type: utils.getType(source),
      ext: utils.getExtension(source),
      name: utils.getName(source),
    };
  },

  // wrap buffer as a operational object
  wrapBuffer: function(buffer, info) {
    if (!info || typeof info !== 'object') {
      throw Error('file info is required');
    }

    const originInfo = Object.assign({}, {
      name: info.name,
      ext: info.ext,
      type: info.type,
    });

    const processInfo = {
    };

    return Object.assign({
      buffer: buffer
    }, {
      originInfo: originInfo
    }, {
      processInfo: processInfo
    });
  },

  flattenArray: function(array) {
    if (!Array.isArray(array)) {
      return null;
    }
    return array.reduce((prevArray, nextArray) => {
      return prevArray.concat(nextArray)
    }, []);
  },

  isImagePath: function(imagePath) {
    // skip unmatched object
    const imageRE = /.*\.(jpg|jpeg|png|webp)$/;

    return imageRE.test(imagePath);
  }
};

module.exports = utils;
