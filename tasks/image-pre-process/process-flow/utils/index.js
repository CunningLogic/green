var Promise = require('bluebird');
var _ = require('lodash');

var Utils = {
  // skip unmatched object
  filterKeys: function(keys) {
    return _.filter(keys, function(item) {
      return Utils.isImagePath(item.Key);
    });
  },

  isImagePath: function(imagePath) {
    var imageRE = /.*\.(jpg|jpeg|png|webp|eot|otf|svg|ttf|woff|woff2)$/;

    return imageRE.test(imagePath);
  },
};

module.exports = Utils;
