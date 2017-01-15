'use strict';

const Promise = require('bluebird');
const fse = Promise.promisifyAll(require('fs-extra'));
const fs = Promise.promisifyAll(require('fs'));
const path = require('path');
const exec = require('child_process').exec;

// the necessary files
const files = [{
  from: './utils.js',
  to: '../../release/utils/utils.js',
}, {
  from: './s3-util.js',
  to: '../../release/utils/s3-util.js',
}, {
  from: '../index.js',
  to: '../../release/index.js',
}, {
  from: '../config/index.js',
  to: '../../release/config/index.js',
}, {
  from: '../lib/compress.js',
  to: '../../release/lib/compress.js',
}, {
  from: '../lib/convert.js',
  to: '../../release/lib/convert.js',
}, {
  from: '../lib/dispatch.js',
  to: '../../release/lib/dispatch.js',
}, {
  from: '../utils/distribute.js',
  to: '../../release/utils/distribute.js',
}, {
  from: '../bin/transform.js',
  to: '../../release/bin/transform.js',
}];


const basePath = './utils/';

const resolvePath = function(targetPath) {
  let destPath = basePath;
  return path.resolve(destPath, targetPath);
}

const runBuild = function() {
  exec('cd ../release; zip -r package.zip . -x .DS_Store');
}

const copyFiles = function() {
  const copies = files.map(item => {
    return fse.copyAsync(resolvePath(item.from), resolvePath(item.to));
  });

  Promise.all(copies)
  .then(() => {
  // when all done, run a command to zip all files
  runBuild();
  console.log('done!');
  })
  .catch(err => {
    console.log('oops! i can\'t handle that: ', err);
  });
};

const createLib = function() {
  return fs.mkdirAsync(resolvePath('../../release/lib'));
}

const createUtils = function() {
  return fs.mkdirAsync(resolvePath('../../release/utils'));
}

const createConfig = function() {
  return fs.mkdirAsync(resolvePath('../../release/config'));
}

createLib().then(() => {
  return createUtils();
})
.catch(err => {
  if (err.code === 'EEXIST') {
    return createUtils();
  } else {
    console.log('err: ', err);
    throw Error('are you kidding me?');
  }
})
.then(() => {
  return createConfig();
})
.catch(err => {
  if (err.code === 'EEXIST') {
    return createConfig();
  } else {
    console.log('err: ', err);
    throw Error('are you kidding me?');
  }
})
.then(() => {
  copyFiles();
}).catch(err => {
  if (err.code === 'EEXIST') {
    copyFiles();
  } else {
    console.log('err: ', err);
    console.log('are you kidding me?');
  }
});
