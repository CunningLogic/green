;(function(factory) {
  // NOTE
  // This library only support modern browser
  // if it ie8 or older
  // then stop execuate
  var isOldIE = function() {
    var ua = window.navigator.userAgent;
    var msie = ua.indexOf('MSIE ');
    var ieVersion = null;

    if (msie > 0) {
      // IE 10 or older => return version number
       ieVersion = parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
    }

    if (ieVersion && ieVersion < 9)  {
      return true;
    } else {
      return false;
    }
  };

  if (isOldIE()) {
    console.log('SmartImage disabled on unsupported browser..');
    return;
  }

  var root = typeof self == 'object' && self.self == self && self;

  if (typeof define === 'function' && define.amd) {
    define(['dui', 'jquery', 'exports'], function(DUI, jQuery, exports) {
      return factory(root, exports, DUI, jQuery)
    });
  } else if (typeof exports !== 'undefined') {
    var DUI = require('dui');
    var jQuery = require('jQuery');
    module.exports = factory(root, exports, DUI, jQuery);
  } else {
    root.SmartImage = factory(root, {}, root.DUI, root.jQuery);
  }
})(function(root, SmartImage, DUI, jQuery) {
  // alias of jquery
  var $ = jQuery;
  var config = {
    formats: {
      webp: ['chrome', 'opera', 'opera mini', 'chrome for android', 'blink'],
      jpg: '*',
      png: '*',
    },
    quality: {
      high: {
        value: {
          webp: 90,
          png: 90,
          jpg: 90,
        },
        range: [
          1,
          Infinity,
        ],
      },
      medium: {
        value: {
          webp: 80,
          png: 80,
          jpg: 80,
        },
        range: [
          0,
          1,
        ]
      },

      // low: {
      //   value: {
      //     webp: 70,
      //     png: 70,
      //     jpg: 70,
      //   },
      //   range: [
      //     0,
      //     1,
      //   ]
      // }
    },

    enabledPaths: [
      '/support/djicare',
    ],

    optimizedCDNUrl: 'www-optimized.djicdn.com',
  };

  var getQueryString = function() {
    var search = location.search.substring(1).split('&');
    var queryString = {};
    if (search.length > 0 && search[0]) {
      search.forEach(function(item, index) {
        var queryItem = item.split('=');
        if (queryItem.length > 1 && queryItem[0] && queryItem[1]) {
          queryString[queryItem[0]] = queryItem[1];
        }
      });
    }

    return queryString;
  }

  var toArray = function(arrayLikeItem) {
    return Array.prototype.slice.apply(arrayLikeItem);
  }

  var getBrowserName = function() {
    // Opera 8.0+
    var isOpera = (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
    // Firefox 1.0+
    var isFirefox = typeof InstallTrigger !== 'undefined';
    // At least Safari 3+: "[object HTMLElementConstructor]"
    var isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;
    // Internet Explorer 6-11
    var isIE = /*@cc_on!@*/false || !!document.documentMode;
    // Edge 20+
    var isEdge = !isIE && !!window.StyleMedia;
    // Chrome 1+
    var isChrome = !!window.chrome && !!window.chrome.webstore;
    // Blink engine detection
    var isBlink = (isChrome || isOpera) && !!window.CSS;

    if (isOpera) {
      return 'opera';
    } else if (isFirefox) {
      return 'firefox';
    } else if (isSafari) {
      return 'safari';
    } else if (isIE) {
      return 'IE';
    } else if (isEdge) {
      return 'edge';
    } else if (isChrome) {
      return 'chrome';
    } else if (isBlink) {
      return 'blink';
    } else {
      return 'unrecongnised browser';
    }
  };

  // on old browser, it will return 1(default)
  var getDevicePixelRatio = function() {
    return window.devicePixelRatio || 1;
  };

  var isSupportWebP = function() {
    var browser = getBrowserName();

    // check if support webp
    if (config.formats.webp.indexOf(browser) > -1) {
      return true;
    }
  };

  var getImageQuality = function() {
    var dpr = getDevicePixelRatio();
    var quality;
    var currentQuality = 'medium';
    var range;

    for (quality in config.quality) {
      range = config.quality[quality].range;
      if (dpr > range[0] && dpr <= range[1]) {
        currentQuality = quality;
      }
    }

    return currentQuality;
  };

  // cn and hk use qiniu cdn
  // other country use s3 cdn
  var getCDNType = function() {
    var country = DUI.Cookie.get('country');
    var type, types;
    var currentType = 's3';

    for (type in config.cdnType) {
      types = config.cdnType[type];
      if (types.indexOf(country) > -1) {
        currentType = 'qiniu';
      }
    }

    return currentType;
  };


  var pathRE = /^((?:https?\:)?\/\/)([^\/]*)(\S*)\/([^\/]+)\.(jpg|png|webp|jpeg)$/;
  var updatedRE = /\S*_\d{2}\.(?:jpg|png|webp|jpeg)$/;

  var isUpdated = function(path) {
    return updatedRE.test(path);
  }

  var isValidPath = function(path) {
    return pathRE.test(path);
  }

  // parse source
  // it returns filename, ext, and path in an object
  var parseSource = function(url) {
    if (!url || !isValidPath(url)) {
      return false;
    }
    var result = pathRE.exec(url);

    if (!result) {
      return {};
    }

    return {
      protocol: result[1] || '',
      url: result[2] || '',
      path: result[3] || '',
      filename: result[4] || '',
      extension: result[5] || '',
    }
  };

  /**
  * assemble new image path
  * @param {string} url - image url
  * @param {string} format - image format
  * @param {number} quality - image quality
  * @return {string} path - result path
  */
  var qiniuPath = function(url, format, quality) {
    if (!url) {
      return false;
    }
    var source = parseSource(url);

    if (!source) {
      return url;
    }

    var path = source.protocol + config.optimizedCDNUrl + source.path + '/' + source.filename + '_' + quality + '.' + format;
    return path;
  };

  var s3Path = function(url, format, quality) {
    if (!url) {
      return false;
    }
    var source = parseSource(url);
    var path = source.protocol + config.optimizedCDNUrl + source.path + '/' + source.filename + '_' + quality + '.' + format;

    return path;
  }

  // check if is a valid path and if should be updated
  // it should has not been updated and is a valid path
  var shouldUpdate = function(path) {
    return isValidPath(path) && !isUpdated(path);
  }

  // callback queue
  // it's a stack
  // var CallbackQueue = [];

  var parseEnabledOptions = function(optionString) {
    var options = {
      attrEnabled: true,
      retinaEnabled: true,
      bgEnabled: true,
    };
    if (!optionString || typeof optionString !== 'string') {
      return options;
    }

    var result = optionString.split(',');

    if (result.indexOf('attr') > -1) {
      options.attrEnabled = false;
    }

    if (result.indexOf('retina') > -1) {
      options.retinaEnabled = false;
    }

    if (result.indexOf('bg') > -1) {
      options.bgEnabled = false;
    }

    return options;
  }


  var smartImageEnabled = false;

  // check if enable smartimage

  var pathname = location.pathname.replace(/(\/(de|cn|zh-tw|jp|kr|fr|es))?(\/mobile)?/, '');
  var queryString = getQueryString();

  // disable smartimage on dbeta
  if (location.hostname.indexOf('dbeta.me') === -1) {
    // enable smart image in product and enterprise page or specified pages
    if ((config.enabledPaths.indexOf(pathname) > -1) || (pathname.indexOf('product/') > -1) || location.hostname.indexOf('enterprise') === 0) {
      smartImageEnabled = true;
    }
  }

  if (queryString.sie == '1') {
    smartImageEnabled = true;
  } else if (queryString.sie == '0') {
    smartImageEnabled = false;
  }

  if (smartImageEnabled) {
    console.log('%c Image optimization is %cenabled!', 'font-weight:bold;', 'color:#09c;font-weight:bold;');
  }

  /**
  * represents a SmartImage instance
  * @constructor
  * @param {object} options the initialize options
  */
  var SmartImage = function(options) {
    // the options must contains propertys as below
    // the parent selector, detault is body
    //
    this.configure(options);
    this.initialize();
  };

  SmartImage.prototype.constructor = SmartImage;

  SmartImage.prototype.configure = function (options) {
    this.root = options.root || document.body;

    if (!this.rootSelector instanceof HTMLElement) {
      this.rootSelector = document.querySelector(rootSelector);
    }

    this.selector = options.selector || '[data-layzr]';
    this.attr = options.attr || 'data-attr';
    this.retinaAttr = options.retinaAttr || null;
    this.bgAttr = options.bgAttr || null;

    return this;
  };

  SmartImage.prototype.initialize = function() {
    this.browserName = getBrowserName();
    this.devicePixelRatio = getDevicePixelRatio();
    this.isSupportWebP = isSupportWebP();
    this.cdnType = getCDNType();
    this.imageQuality = getImageQuality();

    // print some infomation
    // console.log('current browser is: ', this.browserName);
    // console.log('current browser device pixel ratio is: ', this.devicePixelRatio);
    // console.log('is support webp: ', this.isSupportWebP);
    // console.log('current image quality should be: ', this.imageQuality);
    // console.log('current cdn type is: ', this.cdnType);

    return this;
  };

  SmartImage.prototype.then = function(callback) {
    if (typeof callback === 'function') {
      callback();
      // CallbackQueue.push(callback);
    }
  };

  // SmartImage.prototype.callback = function () {
  //   CallbackQueue.forEach(function(cb, index) {
  //     console.log(cb);
  //     cb.call(null);
  //   });
  // };

  SmartImage.prototype.optimizeSource = function(layzrSource) {
    if (!layzrSource) return;
    if (!smartImageEnabled) {
      return layzrSource;
    }

    var sourcePart = parseSource(layzrSource);
    var format = this.isSupportWebP ? 'webp' : sourcePart.extension;
    var quality = config.quality[this.imageQuality].value[format];

    if (this.cdnType === 'qiniu') {
      return qiniuPath(layzrSource, format, quality);
    } else {
      return s3Path(layzrSource, format, quality);
    }
  }

  SmartImage.prototype.update = function (selector) {
    if (!smartImageEnabled) {
      return this;
    }
    // collect all necessary info
    var layzrElms = toArray(this.root.querySelectorAll(selector || this.selector));
    var attr, retinaAttr, bgAttr;

    // update all layzrElms source to correct source
    layzrElms.forEach(function(elm, index) {
      attr = elm.getAttribute(this.attr);
      retinaAttr = elm.getAttribute(this.retinaAttr);
      bgAttr = elm.getAttribute(this.bgAttr);
      var enabledOptions = {
        attrEnabled: true,
        retinaEnabled: true,
        bgEnabled: true,
      };

      if (elm.dataset && elm.dataset.disable) {
        enabledOptions = parseEnabledOptions(this.dataset.disable);
      }

      if (enabledOptions.attrEnabled && this.attr && attr && shouldUpdate(attr)) {
        elm.setAttribute(this.attr, this.optimizeSource(attr));
      }

      if (enabledOptions.retinaEnabled && this.retinaAttr && retinaAttr && shouldUpdate(retinaAttr)) {
        elm.setAttribute(this.retinaAttr, this.optimizeSource(retinaAttr));
      }

      if (enabledOptions.bgEnabled && this.bgAttr && bgAttr && shouldUpdate(bgAttr)) {
        elm.setAttribute(this.bgAttr, this.optimizeSource(bgAttr));
      }
    }, this);

    return this;
  };

  return SmartImage;
  // 不要问我为什么加这句话
  var cache = no;
});
