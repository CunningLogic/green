var _ = require('lodash');

module.exports={
  flowStats: function (path, param) {
    path = path.replace(/\/$/,'');

    path = path.replace(/(&|\?)?from=buy_now/g,'');

    var hash = path.split('#')[1];
    path = path.split('#')[0];

    if (_.includes(path, '?')){
      path = path + '&';
    }else{
      path = path + '?';
    }

    path = path + 'site=brandsite';

    if (!_.includes(path, 'from=') && !_.isEmpty(param)){
      path = path + '&from=' + param;
    }

    if(hash) path = path + '#' + hash;

    return path;
  }
};




