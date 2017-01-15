var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var path = require('path');
var logPath = '../log/log.json';

var LoggerUtils = {
  write: function(data) {
    var wrappedData = JSON.stringify({
      date: new Date(),
      data: data,
    });

    return fs.writeFileAsync(logPath, wrappedData);
  },

  read: function() {
    return fs.readFileAsync(logPath)
    .then(function(result) {
      return new Promise(function(resolve, reject) {
        var wrappedData;
        if (result.length === 0) {
          return resolve({});
        }
        try {
          wrappedData = JSON.parse(result);
          resolve(wrappedData.data);
        } catch(e) {
          reject(e);
        }
      });
    });
  }
};

module.exports = LoggerUtils;
