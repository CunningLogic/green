/***************************************
*  config necessary data
*  @author abram
****************************************/
module.exports = {
  // quality needs to compressed
  quality: [90, 80],
  // quality: [80],
  originQuality: 85,

  // config the rules will be converted
  rules: {
    jpeg: [
      'jpeg',
      'webp'
    ],
    png: [
      'png',
      'webp'
    ],
    webp: [
      'webp'
    ]
  },

  accessedImageTypes: [
    'jpg',
    'jpeg',
    'png',
    'webp'
  ],

  copyItems: [
    'eot',
    'otf',
    'svg',
    'ttf',
    'woff',
    'woff2',
  ],

  // the destination bucket
  // it must created on s3 manually
  destBucket: {
    'dji-www': 'virginia-www-optimized-prod',
    'dbeta-me': 'virginia-www-optimized-dbeta',
  }
};
