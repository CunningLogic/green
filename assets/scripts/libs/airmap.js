(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/* @preserve
 * The MIT License (MIT)
 * 
 * Copyright (c) 2013-2015 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
/**
 * bluebird build version 2.10.2
 * Features enabled: core, race, call_get, generators, map, nodeify, promisify, props, reduce, settle, some, cancel, using, filter, any, each, timers
*/
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Promise=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof _dereq_=="function"&&_dereq_;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof _dereq_=="function"&&_dereq_;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var SomePromiseArray = Promise._SomePromiseArray;
function any(promises) {
    var ret = new SomePromiseArray(promises);
    var promise = ret.promise();
    ret.setHowMany(1);
    ret.setUnwrap();
    ret.init();
    return promise;
}

Promise.any = function (promises) {
    return any(promises);
};

Promise.prototype.any = function () {
    return any(this);
};

};

},{}],2:[function(_dereq_,module,exports){
"use strict";
var firstLineError;
try {throw new Error(); } catch (e) {firstLineError = e;}
var schedule = _dereq_("./schedule.js");
var Queue = _dereq_("./queue.js");
var util = _dereq_("./util.js");

function Async() {
    this._isTickUsed = false;
    this._lateQueue = new Queue(16);
    this._normalQueue = new Queue(16);
    this._trampolineEnabled = true;
    var self = this;
    this.drainQueues = function () {
        self._drainQueues();
    };
    this._schedule =
        schedule.isStatic ? schedule(this.drainQueues) : schedule;
}

Async.prototype.disableTrampolineIfNecessary = function() {
    if (util.hasDevTools) {
        this._trampolineEnabled = false;
    }
};

Async.prototype.enableTrampoline = function() {
    if (!this._trampolineEnabled) {
        this._trampolineEnabled = true;
        this._schedule = function(fn) {
            setTimeout(fn, 0);
        };
    }
};

Async.prototype.haveItemsQueued = function () {
    return this._normalQueue.length() > 0;
};

Async.prototype.throwLater = function(fn, arg) {
    if (arguments.length === 1) {
        arg = fn;
        fn = function () { throw arg; };
    }
    if (typeof setTimeout !== "undefined") {
        setTimeout(function() {
            fn(arg);
        }, 0);
    } else try {
        this._schedule(function() {
            fn(arg);
        });
    } catch (e) {
        throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/m3OTXk\u000a");
    }
};

function AsyncInvokeLater(fn, receiver, arg) {
    this._lateQueue.push(fn, receiver, arg);
    this._queueTick();
}

function AsyncInvoke(fn, receiver, arg) {
    this._normalQueue.push(fn, receiver, arg);
    this._queueTick();
}

function AsyncSettlePromises(promise) {
    this._normalQueue._pushOne(promise);
    this._queueTick();
}

if (!util.hasDevTools) {
    Async.prototype.invokeLater = AsyncInvokeLater;
    Async.prototype.invoke = AsyncInvoke;
    Async.prototype.settlePromises = AsyncSettlePromises;
} else {
    if (schedule.isStatic) {
        schedule = function(fn) { setTimeout(fn, 0); };
    }
    Async.prototype.invokeLater = function (fn, receiver, arg) {
        if (this._trampolineEnabled) {
            AsyncInvokeLater.call(this, fn, receiver, arg);
        } else {
            this._schedule(function() {
                setTimeout(function() {
                    fn.call(receiver, arg);
                }, 100);
            });
        }
    };

    Async.prototype.invoke = function (fn, receiver, arg) {
        if (this._trampolineEnabled) {
            AsyncInvoke.call(this, fn, receiver, arg);
        } else {
            this._schedule(function() {
                fn.call(receiver, arg);
            });
        }
    };

    Async.prototype.settlePromises = function(promise) {
        if (this._trampolineEnabled) {
            AsyncSettlePromises.call(this, promise);
        } else {
            this._schedule(function() {
                promise._settlePromises();
            });
        }
    };
}

Async.prototype.invokeFirst = function (fn, receiver, arg) {
    this._normalQueue.unshift(fn, receiver, arg);
    this._queueTick();
};

Async.prototype._drainQueue = function(queue) {
    while (queue.length() > 0) {
        var fn = queue.shift();
        if (typeof fn !== "function") {
            fn._settlePromises();
            continue;
        }
        var receiver = queue.shift();
        var arg = queue.shift();
        fn.call(receiver, arg);
    }
};

Async.prototype._drainQueues = function () {
    this._drainQueue(this._normalQueue);
    this._reset();
    this._drainQueue(this._lateQueue);
};

Async.prototype._queueTick = function () {
    if (!this._isTickUsed) {
        this._isTickUsed = true;
        this._schedule(this.drainQueues);
    }
};

Async.prototype._reset = function () {
    this._isTickUsed = false;
};

module.exports = new Async();
module.exports.firstLineError = firstLineError;

},{"./queue.js":28,"./schedule.js":31,"./util.js":38}],3:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, tryConvertToPromise) {
var rejectThis = function(_, e) {
    this._reject(e);
};

var targetRejected = function(e, context) {
    context.promiseRejectionQueued = true;
    context.bindingPromise._then(rejectThis, rejectThis, null, this, e);
};

var bindingResolved = function(thisArg, context) {
    if (this._isPending()) {
        this._resolveCallback(context.target);
    }
};

var bindingRejected = function(e, context) {
    if (!context.promiseRejectionQueued) this._reject(e);
};

Promise.prototype.bind = function (thisArg) {
    var maybePromise = tryConvertToPromise(thisArg);
    var ret = new Promise(INTERNAL);
    ret._propagateFrom(this, 1);
    var target = this._target();

    ret._setBoundTo(maybePromise);
    if (maybePromise instanceof Promise) {
        var context = {
            promiseRejectionQueued: false,
            promise: ret,
            target: target,
            bindingPromise: maybePromise
        };
        target._then(INTERNAL, targetRejected, ret._progress, ret, context);
        maybePromise._then(
            bindingResolved, bindingRejected, ret._progress, ret, context);
    } else {
        ret._resolveCallback(target);
    }
    return ret;
};

Promise.prototype._setBoundTo = function (obj) {
    if (obj !== undefined) {
        this._bitField = this._bitField | 131072;
        this._boundTo = obj;
    } else {
        this._bitField = this._bitField & (~131072);
    }
};

Promise.prototype._isBound = function () {
    return (this._bitField & 131072) === 131072;
};

Promise.bind = function (thisArg, value) {
    var maybePromise = tryConvertToPromise(thisArg);
    var ret = new Promise(INTERNAL);

    ret._setBoundTo(maybePromise);
    if (maybePromise instanceof Promise) {
        maybePromise._then(function() {
            ret._resolveCallback(value);
        }, ret._reject, ret._progress, ret, null);
    } else {
        ret._resolveCallback(value);
    }
    return ret;
};
};

},{}],4:[function(_dereq_,module,exports){
"use strict";
var old;
if (typeof Promise !== "undefined") old = Promise;
function noConflict() {
    try { if (Promise === bluebird) Promise = old; }
    catch (e) {}
    return bluebird;
}
var bluebird = _dereq_("./promise.js")();
bluebird.noConflict = noConflict;
module.exports = bluebird;

},{"./promise.js":23}],5:[function(_dereq_,module,exports){
"use strict";
var cr = Object.create;
if (cr) {
    var callerCache = cr(null);
    var getterCache = cr(null);
    callerCache[" size"] = getterCache[" size"] = 0;
}

module.exports = function(Promise) {
var util = _dereq_("./util.js");
var canEvaluate = util.canEvaluate;
var isIdentifier = util.isIdentifier;

var getMethodCaller;
var getGetter;
if (!true) {
var makeMethodCaller = function (methodName) {
    return new Function("ensureMethod", "                                    \n\
        return function(obj) {                                               \n\
            'use strict'                                                     \n\
            var len = this.length;                                           \n\
            ensureMethod(obj, 'methodName');                                 \n\
            switch(len) {                                                    \n\
                case 1: return obj.methodName(this[0]);                      \n\
                case 2: return obj.methodName(this[0], this[1]);             \n\
                case 3: return obj.methodName(this[0], this[1], this[2]);    \n\
                case 0: return obj.methodName();                             \n\
                default:                                                     \n\
                    return obj.methodName.apply(obj, this);                  \n\
            }                                                                \n\
        };                                                                   \n\
        ".replace(/methodName/g, methodName))(ensureMethod);
};

var makeGetter = function (propertyName) {
    return new Function("obj", "                                             \n\
        'use strict';                                                        \n\
        return obj.propertyName;                                             \n\
        ".replace("propertyName", propertyName));
};

var getCompiled = function(name, compiler, cache) {
    var ret = cache[name];
    if (typeof ret !== "function") {
        if (!isIdentifier(name)) {
            return null;
        }
        ret = compiler(name);
        cache[name] = ret;
        cache[" size"]++;
        if (cache[" size"] > 512) {
            var keys = Object.keys(cache);
            for (var i = 0; i < 256; ++i) delete cache[keys[i]];
            cache[" size"] = keys.length - 256;
        }
    }
    return ret;
};

getMethodCaller = function(name) {
    return getCompiled(name, makeMethodCaller, callerCache);
};

getGetter = function(name) {
    return getCompiled(name, makeGetter, getterCache);
};
}

function ensureMethod(obj, methodName) {
    var fn;
    if (obj != null) fn = obj[methodName];
    if (typeof fn !== "function") {
        var message = "Object " + util.classString(obj) + " has no method '" +
            util.toString(methodName) + "'";
        throw new Promise.TypeError(message);
    }
    return fn;
}

function caller(obj) {
    var methodName = this.pop();
    var fn = ensureMethod(obj, methodName);
    return fn.apply(obj, this);
}
Promise.prototype.call = function (methodName) {
    var $_len = arguments.length;var args = new Array($_len - 1); for(var $_i = 1; $_i < $_len; ++$_i) {args[$_i - 1] = arguments[$_i];}
    if (!true) {
        if (canEvaluate) {
            var maybeCaller = getMethodCaller(methodName);
            if (maybeCaller !== null) {
                return this._then(
                    maybeCaller, undefined, undefined, args, undefined);
            }
        }
    }
    args.push(methodName);
    return this._then(caller, undefined, undefined, args, undefined);
};

function namedGetter(obj) {
    return obj[this];
}
function indexedGetter(obj) {
    var index = +this;
    if (index < 0) index = Math.max(0, index + obj.length);
    return obj[index];
}
Promise.prototype.get = function (propertyName) {
    var isIndex = (typeof propertyName === "number");
    var getter;
    if (!isIndex) {
        if (canEvaluate) {
            var maybeGetter = getGetter(propertyName);
            getter = maybeGetter !== null ? maybeGetter : namedGetter;
        } else {
            getter = namedGetter;
        }
    } else {
        getter = indexedGetter;
    }
    return this._then(getter, undefined, undefined, propertyName, undefined);
};
};

},{"./util.js":38}],6:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var errors = _dereq_("./errors.js");
var async = _dereq_("./async.js");
var CancellationError = errors.CancellationError;

Promise.prototype._cancel = function (reason) {
    if (!this.isCancellable()) return this;
    var parent;
    var promiseToReject = this;
    while ((parent = promiseToReject._cancellationParent) !== undefined &&
        parent.isCancellable()) {
        promiseToReject = parent;
    }
    this._unsetCancellable();
    promiseToReject._target()._rejectCallback(reason, false, true);
};

Promise.prototype.cancel = function (reason) {
    if (!this.isCancellable()) return this;
    if (reason === undefined) reason = new CancellationError();
    async.invokeLater(this._cancel, this, reason);
    return this;
};

Promise.prototype.cancellable = function () {
    if (this._cancellable()) return this;
    async.enableTrampoline();
    this._setCancellable();
    this._cancellationParent = undefined;
    return this;
};

Promise.prototype.uncancellable = function () {
    var ret = this.then();
    ret._unsetCancellable();
    return ret;
};

Promise.prototype.fork = function (didFulfill, didReject, didProgress) {
    var ret = this._then(didFulfill, didReject, didProgress,
                         undefined, undefined);

    ret._setCancellable();
    ret._cancellationParent = undefined;
    return ret;
};
};

},{"./async.js":2,"./errors.js":13}],7:[function(_dereq_,module,exports){
"use strict";
module.exports = function() {
var async = _dereq_("./async.js");
var util = _dereq_("./util.js");
var bluebirdFramePattern =
    /[\\\/]bluebird[\\\/]js[\\\/](main|debug|zalgo|instrumented)/;
var stackFramePattern = null;
var formatStack = null;
var indentStackFrames = false;
var warn;

function CapturedTrace(parent) {
    this._parent = parent;
    var length = this._length = 1 + (parent === undefined ? 0 : parent._length);
    captureStackTrace(this, CapturedTrace);
    if (length > 32) this.uncycle();
}
util.inherits(CapturedTrace, Error);

CapturedTrace.prototype.uncycle = function() {
    var length = this._length;
    if (length < 2) return;
    var nodes = [];
    var stackToIndex = {};

    for (var i = 0, node = this; node !== undefined; ++i) {
        nodes.push(node);
        node = node._parent;
    }
    length = this._length = i;
    for (var i = length - 1; i >= 0; --i) {
        var stack = nodes[i].stack;
        if (stackToIndex[stack] === undefined) {
            stackToIndex[stack] = i;
        }
    }
    for (var i = 0; i < length; ++i) {
        var currentStack = nodes[i].stack;
        var index = stackToIndex[currentStack];
        if (index !== undefined && index !== i) {
            if (index > 0) {
                nodes[index - 1]._parent = undefined;
                nodes[index - 1]._length = 1;
            }
            nodes[i]._parent = undefined;
            nodes[i]._length = 1;
            var cycleEdgeNode = i > 0 ? nodes[i - 1] : this;

            if (index < length - 1) {
                cycleEdgeNode._parent = nodes[index + 1];
                cycleEdgeNode._parent.uncycle();
                cycleEdgeNode._length =
                    cycleEdgeNode._parent._length + 1;
            } else {
                cycleEdgeNode._parent = undefined;
                cycleEdgeNode._length = 1;
            }
            var currentChildLength = cycleEdgeNode._length + 1;
            for (var j = i - 2; j >= 0; --j) {
                nodes[j]._length = currentChildLength;
                currentChildLength++;
            }
            return;
        }
    }
};

CapturedTrace.prototype.parent = function() {
    return this._parent;
};

CapturedTrace.prototype.hasParent = function() {
    return this._parent !== undefined;
};

CapturedTrace.prototype.attachExtraTrace = function(error) {
    if (error.__stackCleaned__) return;
    this.uncycle();
    var parsed = CapturedTrace.parseStackAndMessage(error);
    var message = parsed.message;
    var stacks = [parsed.stack];

    var trace = this;
    while (trace !== undefined) {
        stacks.push(cleanStack(trace.stack.split("\n")));
        trace = trace._parent;
    }
    removeCommonRoots(stacks);
    removeDuplicateOrEmptyJumps(stacks);
    util.notEnumerableProp(error, "stack", reconstructStack(message, stacks));
    util.notEnumerableProp(error, "__stackCleaned__", true);
};

function reconstructStack(message, stacks) {
    for (var i = 0; i < stacks.length - 1; ++i) {
        stacks[i].push("From previous event:");
        stacks[i] = stacks[i].join("\n");
    }
    if (i < stacks.length) {
        stacks[i] = stacks[i].join("\n");
    }
    return message + "\n" + stacks.join("\n");
}

function removeDuplicateOrEmptyJumps(stacks) {
    for (var i = 0; i < stacks.length; ++i) {
        if (stacks[i].length === 0 ||
            ((i + 1 < stacks.length) && stacks[i][0] === stacks[i+1][0])) {
            stacks.splice(i, 1);
            i--;
        }
    }
}

function removeCommonRoots(stacks) {
    var current = stacks[0];
    for (var i = 1; i < stacks.length; ++i) {
        var prev = stacks[i];
        var currentLastIndex = current.length - 1;
        var currentLastLine = current[currentLastIndex];
        var commonRootMeetPoint = -1;

        for (var j = prev.length - 1; j >= 0; --j) {
            if (prev[j] === currentLastLine) {
                commonRootMeetPoint = j;
                break;
            }
        }

        for (var j = commonRootMeetPoint; j >= 0; --j) {
            var line = prev[j];
            if (current[currentLastIndex] === line) {
                current.pop();
                currentLastIndex--;
            } else {
                break;
            }
        }
        current = prev;
    }
}

function cleanStack(stack) {
    var ret = [];
    for (var i = 0; i < stack.length; ++i) {
        var line = stack[i];
        var isTraceLine = stackFramePattern.test(line) ||
            "    (No stack trace)" === line;
        var isInternalFrame = isTraceLine && shouldIgnore(line);
        if (isTraceLine && !isInternalFrame) {
            if (indentStackFrames && line.charAt(0) !== " ") {
                line = "    " + line;
            }
            ret.push(line);
        }
    }
    return ret;
}

function stackFramesAsArray(error) {
    var stack = error.stack.replace(/\s+$/g, "").split("\n");
    for (var i = 0; i < stack.length; ++i) {
        var line = stack[i];
        if ("    (No stack trace)" === line || stackFramePattern.test(line)) {
            break;
        }
    }
    if (i > 0) {
        stack = stack.slice(i);
    }
    return stack;
}

CapturedTrace.parseStackAndMessage = function(error) {
    var stack = error.stack;
    var message = error.toString();
    stack = typeof stack === "string" && stack.length > 0
                ? stackFramesAsArray(error) : ["    (No stack trace)"];
    return {
        message: message,
        stack: cleanStack(stack)
    };
};

CapturedTrace.formatAndLogError = function(error, title) {
    if (typeof console !== "undefined") {
        var message;
        if (typeof error === "object" || typeof error === "function") {
            var stack = error.stack;
            message = title + formatStack(stack, error);
        } else {
            message = title + String(error);
        }
        if (typeof warn === "function") {
            warn(message);
        } else if (typeof console.log === "function" ||
            typeof console.log === "object") {
            console.log(message);
        }
    }
};

CapturedTrace.unhandledRejection = function (reason) {
    CapturedTrace.formatAndLogError(reason, "^--- With additional stack trace: ");
};

CapturedTrace.isSupported = function () {
    return typeof captureStackTrace === "function";
};

CapturedTrace.fireRejectionEvent =
function(name, localHandler, reason, promise) {
    var localEventFired = false;
    try {
        if (typeof localHandler === "function") {
            localEventFired = true;
            if (name === "rejectionHandled") {
                localHandler(promise);
            } else {
                localHandler(reason, promise);
            }
        }
    } catch (e) {
        async.throwLater(e);
    }

    var globalEventFired = false;
    try {
        globalEventFired = fireGlobalEvent(name, reason, promise);
    } catch (e) {
        globalEventFired = true;
        async.throwLater(e);
    }

    var domEventFired = false;
    if (fireDomEvent) {
        try {
            domEventFired = fireDomEvent(name.toLowerCase(), {
                reason: reason,
                promise: promise
            });
        } catch (e) {
            domEventFired = true;
            async.throwLater(e);
        }
    }

    if (!globalEventFired && !localEventFired && !domEventFired &&
        name === "unhandledRejection") {
        CapturedTrace.formatAndLogError(reason, "Unhandled rejection ");
    }
};

function formatNonError(obj) {
    var str;
    if (typeof obj === "function") {
        str = "[function " +
            (obj.name || "anonymous") +
            "]";
    } else {
        str = obj.toString();
        var ruselessToString = /\[object [a-zA-Z0-9$_]+\]/;
        if (ruselessToString.test(str)) {
            try {
                var newStr = JSON.stringify(obj);
                str = newStr;
            }
            catch(e) {

            }
        }
        if (str.length === 0) {
            str = "(empty array)";
        }
    }
    return ("(<" + snip(str) + ">, no stack trace)");
}

function snip(str) {
    var maxChars = 41;
    if (str.length < maxChars) {
        return str;
    }
    return str.substr(0, maxChars - 3) + "...";
}

var shouldIgnore = function() { return false; };
var parseLineInfoRegex = /[\/<\(]([^:\/]+):(\d+):(?:\d+)\)?\s*$/;
function parseLineInfo(line) {
    var matches = line.match(parseLineInfoRegex);
    if (matches) {
        return {
            fileName: matches[1],
            line: parseInt(matches[2], 10)
        };
    }
}
CapturedTrace.setBounds = function(firstLineError, lastLineError) {
    if (!CapturedTrace.isSupported()) return;
    var firstStackLines = firstLineError.stack.split("\n");
    var lastStackLines = lastLineError.stack.split("\n");
    var firstIndex = -1;
    var lastIndex = -1;
    var firstFileName;
    var lastFileName;
    for (var i = 0; i < firstStackLines.length; ++i) {
        var result = parseLineInfo(firstStackLines[i]);
        if (result) {
            firstFileName = result.fileName;
            firstIndex = result.line;
            break;
        }
    }
    for (var i = 0; i < lastStackLines.length; ++i) {
        var result = parseLineInfo(lastStackLines[i]);
        if (result) {
            lastFileName = result.fileName;
            lastIndex = result.line;
            break;
        }
    }
    if (firstIndex < 0 || lastIndex < 0 || !firstFileName || !lastFileName ||
        firstFileName !== lastFileName || firstIndex >= lastIndex) {
        return;
    }

    shouldIgnore = function(line) {
        if (bluebirdFramePattern.test(line)) return true;
        var info = parseLineInfo(line);
        if (info) {
            if (info.fileName === firstFileName &&
                (firstIndex <= info.line && info.line <= lastIndex)) {
                return true;
            }
        }
        return false;
    };
};

var captureStackTrace = (function stackDetection() {
    var v8stackFramePattern = /^\s*at\s*/;
    var v8stackFormatter = function(stack, error) {
        if (typeof stack === "string") return stack;

        if (error.name !== undefined &&
            error.message !== undefined) {
            return error.toString();
        }
        return formatNonError(error);
    };

    if (typeof Error.stackTraceLimit === "number" &&
        typeof Error.captureStackTrace === "function") {
        Error.stackTraceLimit = Error.stackTraceLimit + 6;
        stackFramePattern = v8stackFramePattern;
        formatStack = v8stackFormatter;
        var captureStackTrace = Error.captureStackTrace;

        shouldIgnore = function(line) {
            return bluebirdFramePattern.test(line);
        };
        return function(receiver, ignoreUntil) {
            Error.stackTraceLimit = Error.stackTraceLimit + 6;
            captureStackTrace(receiver, ignoreUntil);
            Error.stackTraceLimit = Error.stackTraceLimit - 6;
        };
    }
    var err = new Error();

    if (typeof err.stack === "string" &&
        err.stack.split("\n")[0].indexOf("stackDetection@") >= 0) {
        stackFramePattern = /@/;
        formatStack = v8stackFormatter;
        indentStackFrames = true;
        return function captureStackTrace(o) {
            o.stack = new Error().stack;
        };
    }

    var hasStackAfterThrow;
    try { throw new Error(); }
    catch(e) {
        hasStackAfterThrow = ("stack" in e);
    }
    if (!("stack" in err) && hasStackAfterThrow &&
        typeof Error.stackTraceLimit === "number") {
        stackFramePattern = v8stackFramePattern;
        formatStack = v8stackFormatter;
        return function captureStackTrace(o) {
            Error.stackTraceLimit = Error.stackTraceLimit + 6;
            try { throw new Error(); }
            catch(e) { o.stack = e.stack; }
            Error.stackTraceLimit = Error.stackTraceLimit - 6;
        };
    }

    formatStack = function(stack, error) {
        if (typeof stack === "string") return stack;

        if ((typeof error === "object" ||
            typeof error === "function") &&
            error.name !== undefined &&
            error.message !== undefined) {
            return error.toString();
        }
        return formatNonError(error);
    };

    return null;

})([]);

var fireDomEvent;
var fireGlobalEvent = (function() {
    if (util.isNode) {
        return function(name, reason, promise) {
            if (name === "rejectionHandled") {
                return process.emit(name, promise);
            } else {
                return process.emit(name, reason, promise);
            }
        };
    } else {
        var customEventWorks = false;
        var anyEventWorks = true;
        try {
            var ev = new self.CustomEvent("test");
            customEventWorks = ev instanceof CustomEvent;
        } catch (e) {}
        if (!customEventWorks) {
            try {
                var event = document.createEvent("CustomEvent");
                event.initCustomEvent("testingtheevent", false, true, {});
                self.dispatchEvent(event);
            } catch (e) {
                anyEventWorks = false;
            }
        }
        if (anyEventWorks) {
            fireDomEvent = function(type, detail) {
                var event;
                if (customEventWorks) {
                    event = new self.CustomEvent(type, {
                        detail: detail,
                        bubbles: false,
                        cancelable: true
                    });
                } else if (self.dispatchEvent) {
                    event = document.createEvent("CustomEvent");
                    event.initCustomEvent(type, false, true, detail);
                }

                return event ? !self.dispatchEvent(event) : false;
            };
        }

        var toWindowMethodNameMap = {};
        toWindowMethodNameMap["unhandledRejection"] = ("on" +
            "unhandledRejection").toLowerCase();
        toWindowMethodNameMap["rejectionHandled"] = ("on" +
            "rejectionHandled").toLowerCase();

        return function(name, reason, promise) {
            var methodName = toWindowMethodNameMap[name];
            var method = self[methodName];
            if (!method) return false;
            if (name === "rejectionHandled") {
                method.call(self, promise);
            } else {
                method.call(self, reason, promise);
            }
            return true;
        };
    }
})();

if (typeof console !== "undefined" && typeof console.warn !== "undefined") {
    warn = function (message) {
        console.warn(message);
    };
    if (util.isNode && process.stderr.isTTY) {
        warn = function(message) {
            process.stderr.write("\u001b[31m" + message + "\u001b[39m\n");
        };
    } else if (!util.isNode && typeof (new Error().stack) === "string") {
        warn = function(message) {
            console.warn("%c" + message, "color: red");
        };
    }
}

return CapturedTrace;
};

},{"./async.js":2,"./util.js":38}],8:[function(_dereq_,module,exports){
"use strict";
module.exports = function(NEXT_FILTER) {
var util = _dereq_("./util.js");
var errors = _dereq_("./errors.js");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var keys = _dereq_("./es5.js").keys;
var TypeError = errors.TypeError;

function CatchFilter(instances, callback, promise) {
    this._instances = instances;
    this._callback = callback;
    this._promise = promise;
}

function safePredicate(predicate, e) {
    var safeObject = {};
    var retfilter = tryCatch(predicate).call(safeObject, e);

    if (retfilter === errorObj) return retfilter;

    var safeKeys = keys(safeObject);
    if (safeKeys.length) {
        errorObj.e = new TypeError("Catch filter must inherit from Error or be a simple predicate function\u000a\u000a    See http://goo.gl/o84o68\u000a");
        return errorObj;
    }
    return retfilter;
}

CatchFilter.prototype.doFilter = function (e) {
    var cb = this._callback;
    var promise = this._promise;
    var boundTo = promise._boundValue();
    for (var i = 0, len = this._instances.length; i < len; ++i) {
        var item = this._instances[i];
        var itemIsErrorType = item === Error ||
            (item != null && item.prototype instanceof Error);

        if (itemIsErrorType && e instanceof item) {
            var ret = tryCatch(cb).call(boundTo, e);
            if (ret === errorObj) {
                NEXT_FILTER.e = ret.e;
                return NEXT_FILTER;
            }
            return ret;
        } else if (typeof item === "function" && !itemIsErrorType) {
            var shouldHandle = safePredicate(item, e);
            if (shouldHandle === errorObj) {
                e = errorObj.e;
                break;
            } else if (shouldHandle) {
                var ret = tryCatch(cb).call(boundTo, e);
                if (ret === errorObj) {
                    NEXT_FILTER.e = ret.e;
                    return NEXT_FILTER;
                }
                return ret;
            }
        }
    }
    NEXT_FILTER.e = e;
    return NEXT_FILTER;
};

return CatchFilter;
};

},{"./errors.js":13,"./es5.js":14,"./util.js":38}],9:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, CapturedTrace, isDebugging) {
var contextStack = [];
function Context() {
    this._trace = new CapturedTrace(peekContext());
}
Context.prototype._pushContext = function () {
    if (!isDebugging()) return;
    if (this._trace !== undefined) {
        contextStack.push(this._trace);
    }
};

Context.prototype._popContext = function () {
    if (!isDebugging()) return;
    if (this._trace !== undefined) {
        contextStack.pop();
    }
};

function createContext() {
    if (isDebugging()) return new Context();
}

function peekContext() {
    var lastIndex = contextStack.length - 1;
    if (lastIndex >= 0) {
        return contextStack[lastIndex];
    }
    return undefined;
}

Promise.prototype._peekContext = peekContext;
Promise.prototype._pushContext = Context.prototype._pushContext;
Promise.prototype._popContext = Context.prototype._popContext;

return createContext;
};

},{}],10:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, CapturedTrace) {
var getDomain = Promise._getDomain;
var async = _dereq_("./async.js");
var Warning = _dereq_("./errors.js").Warning;
var util = _dereq_("./util.js");
var canAttachTrace = util.canAttachTrace;
var unhandledRejectionHandled;
var possiblyUnhandledRejection;
var debugging = false || (util.isNode &&
                    (!!process.env["BLUEBIRD_DEBUG"] ||
                     process.env["NODE_ENV"] === "development"));

if (util.isNode && process.env["BLUEBIRD_DEBUG"] == 0) debugging = false;

if (debugging) {
    async.disableTrampolineIfNecessary();
}

Promise.prototype._ignoreRejections = function() {
    this._unsetRejectionIsUnhandled();
    this._bitField = this._bitField | 16777216;
};

Promise.prototype._ensurePossibleRejectionHandled = function () {
    if ((this._bitField & 16777216) !== 0) return;
    this._setRejectionIsUnhandled();
    async.invokeLater(this._notifyUnhandledRejection, this, undefined);
};

Promise.prototype._notifyUnhandledRejectionIsHandled = function () {
    CapturedTrace.fireRejectionEvent("rejectionHandled",
                                  unhandledRejectionHandled, undefined, this);
};

Promise.prototype._notifyUnhandledRejection = function () {
    if (this._isRejectionUnhandled()) {
        var reason = this._getCarriedStackTrace() || this._settledValue;
        this._setUnhandledRejectionIsNotified();
        CapturedTrace.fireRejectionEvent("unhandledRejection",
                                      possiblyUnhandledRejection, reason, this);
    }
};

Promise.prototype._setUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField | 524288;
};

Promise.prototype._unsetUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField & (~524288);
};

Promise.prototype._isUnhandledRejectionNotified = function () {
    return (this._bitField & 524288) > 0;
};

Promise.prototype._setRejectionIsUnhandled = function () {
    this._bitField = this._bitField | 2097152;
};

Promise.prototype._unsetRejectionIsUnhandled = function () {
    this._bitField = this._bitField & (~2097152);
    if (this._isUnhandledRejectionNotified()) {
        this._unsetUnhandledRejectionIsNotified();
        this._notifyUnhandledRejectionIsHandled();
    }
};

Promise.prototype._isRejectionUnhandled = function () {
    return (this._bitField & 2097152) > 0;
};

Promise.prototype._setCarriedStackTrace = function (capturedTrace) {
    this._bitField = this._bitField | 1048576;
    this._fulfillmentHandler0 = capturedTrace;
};

Promise.prototype._isCarryingStackTrace = function () {
    return (this._bitField & 1048576) > 0;
};

Promise.prototype._getCarriedStackTrace = function () {
    return this._isCarryingStackTrace()
        ? this._fulfillmentHandler0
        : undefined;
};

Promise.prototype._captureStackTrace = function () {
    if (debugging) {
        this._trace = new CapturedTrace(this._peekContext());
    }
    return this;
};

Promise.prototype._attachExtraTrace = function (error, ignoreSelf) {
    if (debugging && canAttachTrace(error)) {
        var trace = this._trace;
        if (trace !== undefined) {
            if (ignoreSelf) trace = trace._parent;
        }
        if (trace !== undefined) {
            trace.attachExtraTrace(error);
        } else if (!error.__stackCleaned__) {
            var parsed = CapturedTrace.parseStackAndMessage(error);
            util.notEnumerableProp(error, "stack",
                parsed.message + "\n" + parsed.stack.join("\n"));
            util.notEnumerableProp(error, "__stackCleaned__", true);
        }
    }
};

Promise.prototype._warn = function(message) {
    var warning = new Warning(message);
    var ctx = this._peekContext();
    if (ctx) {
        ctx.attachExtraTrace(warning);
    } else {
        var parsed = CapturedTrace.parseStackAndMessage(warning);
        warning.stack = parsed.message + "\n" + parsed.stack.join("\n");
    }
    CapturedTrace.formatAndLogError(warning, "");
};

Promise.onPossiblyUnhandledRejection = function (fn) {
    var domain = getDomain();
    possiblyUnhandledRejection =
        typeof fn === "function" ? (domain === null ? fn : domain.bind(fn))
                                 : undefined;
};

Promise.onUnhandledRejectionHandled = function (fn) {
    var domain = getDomain();
    unhandledRejectionHandled =
        typeof fn === "function" ? (domain === null ? fn : domain.bind(fn))
                                 : undefined;
};

Promise.longStackTraces = function () {
    if (async.haveItemsQueued() &&
        debugging === false
   ) {
        throw new Error("cannot enable long stack traces after promises have been created\u000a\u000a    See http://goo.gl/DT1qyG\u000a");
    }
    debugging = CapturedTrace.isSupported();
    if (debugging) {
        async.disableTrampolineIfNecessary();
    }
};

Promise.hasLongStackTraces = function () {
    return debugging && CapturedTrace.isSupported();
};

if (!CapturedTrace.isSupported()) {
    Promise.longStackTraces = function(){};
    debugging = false;
}

return function() {
    return debugging;
};
};

},{"./async.js":2,"./errors.js":13,"./util.js":38}],11:[function(_dereq_,module,exports){
"use strict";
var util = _dereq_("./util.js");
var isPrimitive = util.isPrimitive;

module.exports = function(Promise) {
var returner = function () {
    return this;
};
var thrower = function () {
    throw this;
};
var returnUndefined = function() {};
var throwUndefined = function() {
    throw undefined;
};

var wrapper = function (value, action) {
    if (action === 1) {
        return function () {
            throw value;
        };
    } else if (action === 2) {
        return function () {
            return value;
        };
    }
};


Promise.prototype["return"] =
Promise.prototype.thenReturn = function (value) {
    if (value === undefined) return this.then(returnUndefined);

    if (isPrimitive(value)) {
        return this._then(
            wrapper(value, 2),
            undefined,
            undefined,
            undefined,
            undefined
       );
    } else if (value instanceof Promise) {
        value._ignoreRejections();
    }
    return this._then(returner, undefined, undefined, value, undefined);
};

Promise.prototype["throw"] =
Promise.prototype.thenThrow = function (reason) {
    if (reason === undefined) return this.then(throwUndefined);

    if (isPrimitive(reason)) {
        return this._then(
            wrapper(reason, 1),
            undefined,
            undefined,
            undefined,
            undefined
       );
    }
    return this._then(thrower, undefined, undefined, reason, undefined);
};
};

},{"./util.js":38}],12:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var PromiseReduce = Promise.reduce;

Promise.prototype.each = function (fn) {
    return PromiseReduce(this, fn, null, INTERNAL);
};

Promise.each = function (promises, fn) {
    return PromiseReduce(promises, fn, null, INTERNAL);
};
};

},{}],13:[function(_dereq_,module,exports){
"use strict";
var es5 = _dereq_("./es5.js");
var Objectfreeze = es5.freeze;
var util = _dereq_("./util.js");
var inherits = util.inherits;
var notEnumerableProp = util.notEnumerableProp;

function subError(nameProperty, defaultMessage) {
    function SubError(message) {
        if (!(this instanceof SubError)) return new SubError(message);
        notEnumerableProp(this, "message",
            typeof message === "string" ? message : defaultMessage);
        notEnumerableProp(this, "name", nameProperty);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        } else {
            Error.call(this);
        }
    }
    inherits(SubError, Error);
    return SubError;
}

var _TypeError, _RangeError;
var Warning = subError("Warning", "warning");
var CancellationError = subError("CancellationError", "cancellation error");
var TimeoutError = subError("TimeoutError", "timeout error");
var AggregateError = subError("AggregateError", "aggregate error");
try {
    _TypeError = TypeError;
    _RangeError = RangeError;
} catch(e) {
    _TypeError = subError("TypeError", "type error");
    _RangeError = subError("RangeError", "range error");
}

var methods = ("join pop push shift unshift slice filter forEach some " +
    "every map indexOf lastIndexOf reduce reduceRight sort reverse").split(" ");

for (var i = 0; i < methods.length; ++i) {
    if (typeof Array.prototype[methods[i]] === "function") {
        AggregateError.prototype[methods[i]] = Array.prototype[methods[i]];
    }
}

es5.defineProperty(AggregateError.prototype, "length", {
    value: 0,
    configurable: false,
    writable: true,
    enumerable: true
});
AggregateError.prototype["isOperational"] = true;
var level = 0;
AggregateError.prototype.toString = function() {
    var indent = Array(level * 4 + 1).join(" ");
    var ret = "\n" + indent + "AggregateError of:" + "\n";
    level++;
    indent = Array(level * 4 + 1).join(" ");
    for (var i = 0; i < this.length; ++i) {
        var str = this[i] === this ? "[Circular AggregateError]" : this[i] + "";
        var lines = str.split("\n");
        for (var j = 0; j < lines.length; ++j) {
            lines[j] = indent + lines[j];
        }
        str = lines.join("\n");
        ret += str + "\n";
    }
    level--;
    return ret;
};

function OperationalError(message) {
    if (!(this instanceof OperationalError))
        return new OperationalError(message);
    notEnumerableProp(this, "name", "OperationalError");
    notEnumerableProp(this, "message", message);
    this.cause = message;
    this["isOperational"] = true;

    if (message instanceof Error) {
        notEnumerableProp(this, "message", message.message);
        notEnumerableProp(this, "stack", message.stack);
    } else if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
    }

}
inherits(OperationalError, Error);

var errorTypes = Error["__BluebirdErrorTypes__"];
if (!errorTypes) {
    errorTypes = Objectfreeze({
        CancellationError: CancellationError,
        TimeoutError: TimeoutError,
        OperationalError: OperationalError,
        RejectionError: OperationalError,
        AggregateError: AggregateError
    });
    notEnumerableProp(Error, "__BluebirdErrorTypes__", errorTypes);
}

module.exports = {
    Error: Error,
    TypeError: _TypeError,
    RangeError: _RangeError,
    CancellationError: errorTypes.CancellationError,
    OperationalError: errorTypes.OperationalError,
    TimeoutError: errorTypes.TimeoutError,
    AggregateError: errorTypes.AggregateError,
    Warning: Warning
};

},{"./es5.js":14,"./util.js":38}],14:[function(_dereq_,module,exports){
var isES5 = (function(){
    "use strict";
    return this === undefined;
})();

if (isES5) {
    module.exports = {
        freeze: Object.freeze,
        defineProperty: Object.defineProperty,
        getDescriptor: Object.getOwnPropertyDescriptor,
        keys: Object.keys,
        names: Object.getOwnPropertyNames,
        getPrototypeOf: Object.getPrototypeOf,
        isArray: Array.isArray,
        isES5: isES5,
        propertyIsWritable: function(obj, prop) {
            var descriptor = Object.getOwnPropertyDescriptor(obj, prop);
            return !!(!descriptor || descriptor.writable || descriptor.set);
        }
    };
} else {
    var has = {}.hasOwnProperty;
    var str = {}.toString;
    var proto = {}.constructor.prototype;

    var ObjectKeys = function (o) {
        var ret = [];
        for (var key in o) {
            if (has.call(o, key)) {
                ret.push(key);
            }
        }
        return ret;
    };

    var ObjectGetDescriptor = function(o, key) {
        return {value: o[key]};
    };

    var ObjectDefineProperty = function (o, key, desc) {
        o[key] = desc.value;
        return o;
    };

    var ObjectFreeze = function (obj) {
        return obj;
    };

    var ObjectGetPrototypeOf = function (obj) {
        try {
            return Object(obj).constructor.prototype;
        }
        catch (e) {
            return proto;
        }
    };

    var ArrayIsArray = function (obj) {
        try {
            return str.call(obj) === "[object Array]";
        }
        catch(e) {
            return false;
        }
    };

    module.exports = {
        isArray: ArrayIsArray,
        keys: ObjectKeys,
        names: ObjectKeys,
        defineProperty: ObjectDefineProperty,
        getDescriptor: ObjectGetDescriptor,
        freeze: ObjectFreeze,
        getPrototypeOf: ObjectGetPrototypeOf,
        isES5: isES5,
        propertyIsWritable: function() {
            return true;
        }
    };
}

},{}],15:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var PromiseMap = Promise.map;

Promise.prototype.filter = function (fn, options) {
    return PromiseMap(this, fn, options, INTERNAL);
};

Promise.filter = function (promises, fn, options) {
    return PromiseMap(promises, fn, options, INTERNAL);
};
};

},{}],16:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, NEXT_FILTER, tryConvertToPromise) {
var util = _dereq_("./util.js");
var isPrimitive = util.isPrimitive;
var thrower = util.thrower;

function returnThis() {
    return this;
}
function throwThis() {
    throw this;
}
function return$(r) {
    return function() {
        return r;
    };
}
function throw$(r) {
    return function() {
        throw r;
    };
}
function promisedFinally(ret, reasonOrValue, isFulfilled) {
    var then;
    if (isPrimitive(reasonOrValue)) {
        then = isFulfilled ? return$(reasonOrValue) : throw$(reasonOrValue);
    } else {
        then = isFulfilled ? returnThis : throwThis;
    }
    return ret._then(then, thrower, undefined, reasonOrValue, undefined);
}

function finallyHandler(reasonOrValue) {
    var promise = this.promise;
    var handler = this.handler;

    var ret = promise._isBound()
                    ? handler.call(promise._boundValue())
                    : handler();

    if (ret !== undefined) {
        var maybePromise = tryConvertToPromise(ret, promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            return promisedFinally(maybePromise, reasonOrValue,
                                    promise.isFulfilled());
        }
    }

    if (promise.isRejected()) {
        NEXT_FILTER.e = reasonOrValue;
        return NEXT_FILTER;
    } else {
        return reasonOrValue;
    }
}

function tapHandler(value) {
    var promise = this.promise;
    var handler = this.handler;

    var ret = promise._isBound()
                    ? handler.call(promise._boundValue(), value)
                    : handler(value);

    if (ret !== undefined) {
        var maybePromise = tryConvertToPromise(ret, promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            return promisedFinally(maybePromise, value, true);
        }
    }
    return value;
}

Promise.prototype._passThroughHandler = function (handler, isFinally) {
    if (typeof handler !== "function") return this.then();

    var promiseAndHandler = {
        promise: this,
        handler: handler
    };

    return this._then(
            isFinally ? finallyHandler : tapHandler,
            isFinally ? finallyHandler : undefined, undefined,
            promiseAndHandler, undefined);
};

Promise.prototype.lastly =
Promise.prototype["finally"] = function (handler) {
    return this._passThroughHandler(handler, true);
};

Promise.prototype.tap = function (handler) {
    return this._passThroughHandler(handler, false);
};
};

},{"./util.js":38}],17:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          apiRejection,
                          INTERNAL,
                          tryConvertToPromise) {
var errors = _dereq_("./errors.js");
var TypeError = errors.TypeError;
var util = _dereq_("./util.js");
var errorObj = util.errorObj;
var tryCatch = util.tryCatch;
var yieldHandlers = [];

function promiseFromYieldHandler(value, yieldHandlers, traceParent) {
    for (var i = 0; i < yieldHandlers.length; ++i) {
        traceParent._pushContext();
        var result = tryCatch(yieldHandlers[i])(value);
        traceParent._popContext();
        if (result === errorObj) {
            traceParent._pushContext();
            var ret = Promise.reject(errorObj.e);
            traceParent._popContext();
            return ret;
        }
        var maybePromise = tryConvertToPromise(result, traceParent);
        if (maybePromise instanceof Promise) return maybePromise;
    }
    return null;
}

function PromiseSpawn(generatorFunction, receiver, yieldHandler, stack) {
    var promise = this._promise = new Promise(INTERNAL);
    promise._captureStackTrace();
    this._stack = stack;
    this._generatorFunction = generatorFunction;
    this._receiver = receiver;
    this._generator = undefined;
    this._yieldHandlers = typeof yieldHandler === "function"
        ? [yieldHandler].concat(yieldHandlers)
        : yieldHandlers;
}

PromiseSpawn.prototype.promise = function () {
    return this._promise;
};

PromiseSpawn.prototype._run = function () {
    this._generator = this._generatorFunction.call(this._receiver);
    this._receiver =
        this._generatorFunction = undefined;
    this._next(undefined);
};

PromiseSpawn.prototype._continue = function (result) {
    if (result === errorObj) {
        return this._promise._rejectCallback(result.e, false, true);
    }

    var value = result.value;
    if (result.done === true) {
        this._promise._resolveCallback(value);
    } else {
        var maybePromise = tryConvertToPromise(value, this._promise);
        if (!(maybePromise instanceof Promise)) {
            maybePromise =
                promiseFromYieldHandler(maybePromise,
                                        this._yieldHandlers,
                                        this._promise);
            if (maybePromise === null) {
                this._throw(
                    new TypeError(
                        "A value %s was yielded that could not be treated as a promise\u000a\u000a    See http://goo.gl/4Y4pDk\u000a\u000a".replace("%s", value) +
                        "From coroutine:\u000a" +
                        this._stack.split("\n").slice(1, -7).join("\n")
                    )
                );
                return;
            }
        }
        maybePromise._then(
            this._next,
            this._throw,
            undefined,
            this,
            null
       );
    }
};

PromiseSpawn.prototype._throw = function (reason) {
    this._promise._attachExtraTrace(reason);
    this._promise._pushContext();
    var result = tryCatch(this._generator["throw"])
        .call(this._generator, reason);
    this._promise._popContext();
    this._continue(result);
};

PromiseSpawn.prototype._next = function (value) {
    this._promise._pushContext();
    var result = tryCatch(this._generator.next).call(this._generator, value);
    this._promise._popContext();
    this._continue(result);
};

Promise.coroutine = function (generatorFunction, options) {
    if (typeof generatorFunction !== "function") {
        throw new TypeError("generatorFunction must be a function\u000a\u000a    See http://goo.gl/6Vqhm0\u000a");
    }
    var yieldHandler = Object(options).yieldHandler;
    var PromiseSpawn$ = PromiseSpawn;
    var stack = new Error().stack;
    return function () {
        var generator = generatorFunction.apply(this, arguments);
        var spawn = new PromiseSpawn$(undefined, undefined, yieldHandler,
                                      stack);
        spawn._generator = generator;
        spawn._next(undefined);
        return spawn.promise();
    };
};

Promise.coroutine.addYieldHandler = function(fn) {
    if (typeof fn !== "function") throw new TypeError("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    yieldHandlers.push(fn);
};

Promise.spawn = function (generatorFunction) {
    if (typeof generatorFunction !== "function") {
        return apiRejection("generatorFunction must be a function\u000a\u000a    See http://goo.gl/6Vqhm0\u000a");
    }
    var spawn = new PromiseSpawn(generatorFunction, this);
    var ret = spawn.promise();
    spawn._run(Promise.spawn);
    return ret;
};
};

},{"./errors.js":13,"./util.js":38}],18:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, PromiseArray, tryConvertToPromise, INTERNAL) {
var util = _dereq_("./util.js");
var canEvaluate = util.canEvaluate;
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var reject;

if (!true) {
if (canEvaluate) {
    var thenCallback = function(i) {
        return new Function("value", "holder", "                             \n\
            'use strict';                                                    \n\
            holder.pIndex = value;                                           \n\
            holder.checkFulfillment(this);                                   \n\
            ".replace(/Index/g, i));
    };

    var caller = function(count) {
        var values = [];
        for (var i = 1; i <= count; ++i) values.push("holder.p" + i);
        return new Function("holder", "                                      \n\
            'use strict';                                                    \n\
            var callback = holder.fn;                                        \n\
            return callback(values);                                         \n\
            ".replace(/values/g, values.join(", ")));
    };
    var thenCallbacks = [];
    var callers = [undefined];
    for (var i = 1; i <= 5; ++i) {
        thenCallbacks.push(thenCallback(i));
        callers.push(caller(i));
    }

    var Holder = function(total, fn) {
        this.p1 = this.p2 = this.p3 = this.p4 = this.p5 = null;
        this.fn = fn;
        this.total = total;
        this.now = 0;
    };

    Holder.prototype.callers = callers;
    Holder.prototype.checkFulfillment = function(promise) {
        var now = this.now;
        now++;
        var total = this.total;
        if (now >= total) {
            var handler = this.callers[total];
            promise._pushContext();
            var ret = tryCatch(handler)(this);
            promise._popContext();
            if (ret === errorObj) {
                promise._rejectCallback(ret.e, false, true);
            } else {
                promise._resolveCallback(ret);
            }
        } else {
            this.now = now;
        }
    };

    var reject = function (reason) {
        this._reject(reason);
    };
}
}

Promise.join = function () {
    var last = arguments.length - 1;
    var fn;
    if (last > 0 && typeof arguments[last] === "function") {
        fn = arguments[last];
        if (!true) {
            if (last < 6 && canEvaluate) {
                var ret = new Promise(INTERNAL);
                ret._captureStackTrace();
                var holder = new Holder(last, fn);
                var callbacks = thenCallbacks;
                for (var i = 0; i < last; ++i) {
                    var maybePromise = tryConvertToPromise(arguments[i], ret);
                    if (maybePromise instanceof Promise) {
                        maybePromise = maybePromise._target();
                        if (maybePromise._isPending()) {
                            maybePromise._then(callbacks[i], reject,
                                               undefined, ret, holder);
                        } else if (maybePromise._isFulfilled()) {
                            callbacks[i].call(ret,
                                              maybePromise._value(), holder);
                        } else {
                            ret._reject(maybePromise._reason());
                        }
                    } else {
                        callbacks[i].call(ret, maybePromise, holder);
                    }
                }
                return ret;
            }
        }
    }
    var $_len = arguments.length;var args = new Array($_len); for(var $_i = 0; $_i < $_len; ++$_i) {args[$_i] = arguments[$_i];}
    if (fn) args.pop();
    var ret = new PromiseArray(args).promise();
    return fn !== undefined ? ret.spread(fn) : ret;
};

};

},{"./util.js":38}],19:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          PromiseArray,
                          apiRejection,
                          tryConvertToPromise,
                          INTERNAL) {
var getDomain = Promise._getDomain;
var async = _dereq_("./async.js");
var util = _dereq_("./util.js");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var PENDING = {};
var EMPTY_ARRAY = [];

function MappingPromiseArray(promises, fn, limit, _filter) {
    this.constructor$(promises);
    this._promise._captureStackTrace();
    var domain = getDomain();
    this._callback = domain === null ? fn : domain.bind(fn);
    this._preservedValues = _filter === INTERNAL
        ? new Array(this.length())
        : null;
    this._limit = limit;
    this._inFlight = 0;
    this._queue = limit >= 1 ? [] : EMPTY_ARRAY;
    async.invoke(init, this, undefined);
}
util.inherits(MappingPromiseArray, PromiseArray);
function init() {this._init$(undefined, -2);}

MappingPromiseArray.prototype._init = function () {};

MappingPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var values = this._values;
    var length = this.length();
    var preservedValues = this._preservedValues;
    var limit = this._limit;
    if (values[index] === PENDING) {
        values[index] = value;
        if (limit >= 1) {
            this._inFlight--;
            this._drainQueue();
            if (this._isResolved()) return;
        }
    } else {
        if (limit >= 1 && this._inFlight >= limit) {
            values[index] = value;
            this._queue.push(index);
            return;
        }
        if (preservedValues !== null) preservedValues[index] = value;

        var callback = this._callback;
        var receiver = this._promise._boundValue();
        this._promise._pushContext();
        var ret = tryCatch(callback).call(receiver, value, index, length);
        this._promise._popContext();
        if (ret === errorObj) return this._reject(ret.e);

        var maybePromise = tryConvertToPromise(ret, this._promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            if (maybePromise._isPending()) {
                if (limit >= 1) this._inFlight++;
                values[index] = PENDING;
                return maybePromise._proxyPromiseArray(this, index);
            } else if (maybePromise._isFulfilled()) {
                ret = maybePromise._value();
            } else {
                return this._reject(maybePromise._reason());
            }
        }
        values[index] = ret;
    }
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= length) {
        if (preservedValues !== null) {
            this._filter(values, preservedValues);
        } else {
            this._resolve(values);
        }

    }
};

MappingPromiseArray.prototype._drainQueue = function () {
    var queue = this._queue;
    var limit = this._limit;
    var values = this._values;
    while (queue.length > 0 && this._inFlight < limit) {
        if (this._isResolved()) return;
        var index = queue.pop();
        this._promiseFulfilled(values[index], index);
    }
};

MappingPromiseArray.prototype._filter = function (booleans, values) {
    var len = values.length;
    var ret = new Array(len);
    var j = 0;
    for (var i = 0; i < len; ++i) {
        if (booleans[i]) ret[j++] = values[i];
    }
    ret.length = j;
    this._resolve(ret);
};

MappingPromiseArray.prototype.preservedValues = function () {
    return this._preservedValues;
};

function map(promises, fn, options, _filter) {
    var limit = typeof options === "object" && options !== null
        ? options.concurrency
        : 0;
    limit = typeof limit === "number" &&
        isFinite(limit) && limit >= 1 ? limit : 0;
    return new MappingPromiseArray(promises, fn, limit, _filter);
}

Promise.prototype.map = function (fn, options) {
    if (typeof fn !== "function") return apiRejection("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");

    return map(this, fn, options, null).promise();
};

Promise.map = function (promises, fn, options, _filter) {
    if (typeof fn !== "function") return apiRejection("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    return map(promises, fn, options, _filter).promise();
};


};

},{"./async.js":2,"./util.js":38}],20:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, INTERNAL, tryConvertToPromise, apiRejection) {
var util = _dereq_("./util.js");
var tryCatch = util.tryCatch;

Promise.method = function (fn) {
    if (typeof fn !== "function") {
        throw new Promise.TypeError("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    }
    return function () {
        var ret = new Promise(INTERNAL);
        ret._captureStackTrace();
        ret._pushContext();
        var value = tryCatch(fn).apply(this, arguments);
        ret._popContext();
        ret._resolveFromSyncValue(value);
        return ret;
    };
};

Promise.attempt = Promise["try"] = function (fn, args, ctx) {
    if (typeof fn !== "function") {
        return apiRejection("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    }
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    ret._pushContext();
    var value = util.isArray(args)
        ? tryCatch(fn).apply(ctx, args)
        : tryCatch(fn).call(ctx, args);
    ret._popContext();
    ret._resolveFromSyncValue(value);
    return ret;
};

Promise.prototype._resolveFromSyncValue = function (value) {
    if (value === util.errorObj) {
        this._rejectCallback(value.e, false, true);
    } else {
        this._resolveCallback(value, true);
    }
};
};

},{"./util.js":38}],21:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var util = _dereq_("./util.js");
var async = _dereq_("./async.js");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;

function spreadAdapter(val, nodeback) {
    var promise = this;
    if (!util.isArray(val)) return successAdapter.call(promise, val, nodeback);
    var ret =
        tryCatch(nodeback).apply(promise._boundValue(), [null].concat(val));
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}

function successAdapter(val, nodeback) {
    var promise = this;
    var receiver = promise._boundValue();
    var ret = val === undefined
        ? tryCatch(nodeback).call(receiver, null)
        : tryCatch(nodeback).call(receiver, null, val);
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}
function errorAdapter(reason, nodeback) {
    var promise = this;
    if (!reason) {
        var target = promise._target();
        var newReason = target._getCarriedStackTrace();
        newReason.cause = reason;
        reason = newReason;
    }
    var ret = tryCatch(nodeback).call(promise._boundValue(), reason);
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}

Promise.prototype.asCallback =
Promise.prototype.nodeify = function (nodeback, options) {
    if (typeof nodeback == "function") {
        var adapter = successAdapter;
        if (options !== undefined && Object(options).spread) {
            adapter = spreadAdapter;
        }
        this._then(
            adapter,
            errorAdapter,
            undefined,
            this,
            nodeback
        );
    }
    return this;
};
};

},{"./async.js":2,"./util.js":38}],22:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, PromiseArray) {
var util = _dereq_("./util.js");
var async = _dereq_("./async.js");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;

Promise.prototype.progressed = function (handler) {
    return this._then(undefined, undefined, handler, undefined, undefined);
};

Promise.prototype._progress = function (progressValue) {
    if (this._isFollowingOrFulfilledOrRejected()) return;
    this._target()._progressUnchecked(progressValue);

};

Promise.prototype._progressHandlerAt = function (index) {
    return index === 0
        ? this._progressHandler0
        : this[(index << 2) + index - 5 + 2];
};

Promise.prototype._doProgressWith = function (progression) {
    var progressValue = progression.value;
    var handler = progression.handler;
    var promise = progression.promise;
    var receiver = progression.receiver;

    var ret = tryCatch(handler).call(receiver, progressValue);
    if (ret === errorObj) {
        if (ret.e != null &&
            ret.e.name !== "StopProgressPropagation") {
            var trace = util.canAttachTrace(ret.e)
                ? ret.e : new Error(util.toString(ret.e));
            promise._attachExtraTrace(trace);
            promise._progress(ret.e);
        }
    } else if (ret instanceof Promise) {
        ret._then(promise._progress, null, null, promise, undefined);
    } else {
        promise._progress(ret);
    }
};


Promise.prototype._progressUnchecked = function (progressValue) {
    var len = this._length();
    var progress = this._progress;
    for (var i = 0; i < len; i++) {
        var handler = this._progressHandlerAt(i);
        var promise = this._promiseAt(i);
        if (!(promise instanceof Promise)) {
            var receiver = this._receiverAt(i);
            if (typeof handler === "function") {
                handler.call(receiver, progressValue, promise);
            } else if (receiver instanceof PromiseArray &&
                       !receiver._isResolved()) {
                receiver._promiseProgressed(progressValue, promise);
            }
            continue;
        }

        if (typeof handler === "function") {
            async.invoke(this._doProgressWith, this, {
                handler: handler,
                promise: promise,
                receiver: this._receiverAt(i),
                value: progressValue
            });
        } else {
            async.invoke(progress, promise, progressValue);
        }
    }
};
};

},{"./async.js":2,"./util.js":38}],23:[function(_dereq_,module,exports){
"use strict";
module.exports = function() {
var makeSelfResolutionError = function () {
    return new TypeError("circular promise resolution chain\u000a\u000a    See http://goo.gl/LhFpo0\u000a");
};
var reflect = function() {
    return new Promise.PromiseInspection(this._target());
};
var apiRejection = function(msg) {
    return Promise.reject(new TypeError(msg));
};

var util = _dereq_("./util.js");

var getDomain;
if (util.isNode) {
    getDomain = function() {
        var ret = process.domain;
        if (ret === undefined) ret = null;
        return ret;
    };
} else {
    getDomain = function() {
        return null;
    };
}
util.notEnumerableProp(Promise, "_getDomain", getDomain);

var UNDEFINED_BINDING = {};
var async = _dereq_("./async.js");
var errors = _dereq_("./errors.js");
var TypeError = Promise.TypeError = errors.TypeError;
Promise.RangeError = errors.RangeError;
Promise.CancellationError = errors.CancellationError;
Promise.TimeoutError = errors.TimeoutError;
Promise.OperationalError = errors.OperationalError;
Promise.RejectionError = errors.OperationalError;
Promise.AggregateError = errors.AggregateError;
var INTERNAL = function(){};
var APPLY = {};
var NEXT_FILTER = {e: null};
var tryConvertToPromise = _dereq_("./thenables.js")(Promise, INTERNAL);
var PromiseArray =
    _dereq_("./promise_array.js")(Promise, INTERNAL,
                                    tryConvertToPromise, apiRejection);
var CapturedTrace = _dereq_("./captured_trace.js")();
var isDebugging = _dereq_("./debuggability.js")(Promise, CapturedTrace);
 /*jshint unused:false*/
var createContext =
    _dereq_("./context.js")(Promise, CapturedTrace, isDebugging);
var CatchFilter = _dereq_("./catch_filter.js")(NEXT_FILTER);
var PromiseResolver = _dereq_("./promise_resolver.js");
var nodebackForPromise = PromiseResolver._nodebackForPromise;
var errorObj = util.errorObj;
var tryCatch = util.tryCatch;
function Promise(resolver) {
    if (typeof resolver !== "function") {
        throw new TypeError("the promise constructor requires a resolver function\u000a\u000a    See http://goo.gl/EC22Yn\u000a");
    }
    if (this.constructor !== Promise) {
        throw new TypeError("the promise constructor cannot be invoked directly\u000a\u000a    See http://goo.gl/KsIlge\u000a");
    }
    this._bitField = 0;
    this._fulfillmentHandler0 = undefined;
    this._rejectionHandler0 = undefined;
    this._progressHandler0 = undefined;
    this._promise0 = undefined;
    this._receiver0 = undefined;
    this._settledValue = undefined;
    if (resolver !== INTERNAL) this._resolveFromResolver(resolver);
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.caught = Promise.prototype["catch"] = function (fn) {
    var len = arguments.length;
    if (len > 1) {
        var catchInstances = new Array(len - 1),
            j = 0, i;
        for (i = 0; i < len - 1; ++i) {
            var item = arguments[i];
            if (typeof item === "function") {
                catchInstances[j++] = item;
            } else {
                return Promise.reject(
                    new TypeError("Catch filter must inherit from Error or be a simple predicate function\u000a\u000a    See http://goo.gl/o84o68\u000a"));
            }
        }
        catchInstances.length = j;
        fn = arguments[i];
        var catchFilter = new CatchFilter(catchInstances, fn, this);
        return this._then(undefined, catchFilter.doFilter, undefined,
            catchFilter, undefined);
    }
    return this._then(undefined, fn, undefined, undefined, undefined);
};

Promise.prototype.reflect = function () {
    return this._then(reflect, reflect, undefined, this, undefined);
};

Promise.prototype.then = function (didFulfill, didReject, didProgress) {
    if (isDebugging() && arguments.length > 0 &&
        typeof didFulfill !== "function" &&
        typeof didReject !== "function") {
        var msg = ".then() only accepts functions but was passed: " +
                util.classString(didFulfill);
        if (arguments.length > 1) {
            msg += ", " + util.classString(didReject);
        }
        this._warn(msg);
    }
    return this._then(didFulfill, didReject, didProgress,
        undefined, undefined);
};

Promise.prototype.done = function (didFulfill, didReject, didProgress) {
    var promise = this._then(didFulfill, didReject, didProgress,
        undefined, undefined);
    promise._setIsFinal();
};

Promise.prototype.spread = function (didFulfill, didReject) {
    return this.all()._then(didFulfill, didReject, undefined, APPLY, undefined);
};

Promise.prototype.isCancellable = function () {
    return !this.isResolved() &&
        this._cancellable();
};

Promise.prototype.toJSON = function () {
    var ret = {
        isFulfilled: false,
        isRejected: false,
        fulfillmentValue: undefined,
        rejectionReason: undefined
    };
    if (this.isFulfilled()) {
        ret.fulfillmentValue = this.value();
        ret.isFulfilled = true;
    } else if (this.isRejected()) {
        ret.rejectionReason = this.reason();
        ret.isRejected = true;
    }
    return ret;
};

Promise.prototype.all = function () {
    return new PromiseArray(this).promise();
};

Promise.prototype.error = function (fn) {
    return this.caught(util.originatesFromRejection, fn);
};

Promise.is = function (val) {
    return val instanceof Promise;
};

Promise.fromNode = function(fn) {
    var ret = new Promise(INTERNAL);
    var result = tryCatch(fn)(nodebackForPromise(ret));
    if (result === errorObj) {
        ret._rejectCallback(result.e, true, true);
    }
    return ret;
};

Promise.all = function (promises) {
    return new PromiseArray(promises).promise();
};

Promise.defer = Promise.pending = function () {
    var promise = new Promise(INTERNAL);
    return new PromiseResolver(promise);
};

Promise.cast = function (obj) {
    var ret = tryConvertToPromise(obj);
    if (!(ret instanceof Promise)) {
        var val = ret;
        ret = new Promise(INTERNAL);
        ret._fulfillUnchecked(val);
    }
    return ret;
};

Promise.resolve = Promise.fulfilled = Promise.cast;

Promise.reject = Promise.rejected = function (reason) {
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    ret._rejectCallback(reason, true);
    return ret;
};

Promise.setScheduler = function(fn) {
    if (typeof fn !== "function") throw new TypeError("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    var prev = async._schedule;
    async._schedule = fn;
    return prev;
};

Promise.prototype._then = function (
    didFulfill,
    didReject,
    didProgress,
    receiver,
    internalData
) {
    var haveInternalData = internalData !== undefined;
    var ret = haveInternalData ? internalData : new Promise(INTERNAL);

    if (!haveInternalData) {
        ret._propagateFrom(this, 4 | 1);
        ret._captureStackTrace();
    }

    var target = this._target();
    if (target !== this) {
        if (receiver === undefined) receiver = this._boundTo;
        if (!haveInternalData) ret._setIsMigrated();
    }

    var callbackIndex = target._addCallbacks(didFulfill,
                                             didReject,
                                             didProgress,
                                             ret,
                                             receiver,
                                             getDomain());

    if (target._isResolved() && !target._isSettlePromisesQueued()) {
        async.invoke(
            target._settlePromiseAtPostResolution, target, callbackIndex);
    }

    return ret;
};

Promise.prototype._settlePromiseAtPostResolution = function (index) {
    if (this._isRejectionUnhandled()) this._unsetRejectionIsUnhandled();
    this._settlePromiseAt(index);
};

Promise.prototype._length = function () {
    return this._bitField & 131071;
};

Promise.prototype._isFollowingOrFulfilledOrRejected = function () {
    return (this._bitField & 939524096) > 0;
};

Promise.prototype._isFollowing = function () {
    return (this._bitField & 536870912) === 536870912;
};

Promise.prototype._setLength = function (len) {
    this._bitField = (this._bitField & -131072) |
        (len & 131071);
};

Promise.prototype._setFulfilled = function () {
    this._bitField = this._bitField | 268435456;
};

Promise.prototype._setRejected = function () {
    this._bitField = this._bitField | 134217728;
};

Promise.prototype._setFollowing = function () {
    this._bitField = this._bitField | 536870912;
};

Promise.prototype._setIsFinal = function () {
    this._bitField = this._bitField | 33554432;
};

Promise.prototype._isFinal = function () {
    return (this._bitField & 33554432) > 0;
};

Promise.prototype._cancellable = function () {
    return (this._bitField & 67108864) > 0;
};

Promise.prototype._setCancellable = function () {
    this._bitField = this._bitField | 67108864;
};

Promise.prototype._unsetCancellable = function () {
    this._bitField = this._bitField & (~67108864);
};

Promise.prototype._setIsMigrated = function () {
    this._bitField = this._bitField | 4194304;
};

Promise.prototype._unsetIsMigrated = function () {
    this._bitField = this._bitField & (~4194304);
};

Promise.prototype._isMigrated = function () {
    return (this._bitField & 4194304) > 0;
};

Promise.prototype._receiverAt = function (index) {
    var ret = index === 0
        ? this._receiver0
        : this[
            index * 5 - 5 + 4];
    if (ret === UNDEFINED_BINDING) {
        return undefined;
    } else if (ret === undefined && this._isBound()) {
        return this._boundValue();
    }
    return ret;
};

Promise.prototype._promiseAt = function (index) {
    return index === 0
        ? this._promise0
        : this[index * 5 - 5 + 3];
};

Promise.prototype._fulfillmentHandlerAt = function (index) {
    return index === 0
        ? this._fulfillmentHandler0
        : this[index * 5 - 5 + 0];
};

Promise.prototype._rejectionHandlerAt = function (index) {
    return index === 0
        ? this._rejectionHandler0
        : this[index * 5 - 5 + 1];
};

Promise.prototype._boundValue = function() {
    var ret = this._boundTo;
    if (ret !== undefined) {
        if (ret instanceof Promise) {
            if (ret.isFulfilled()) {
                return ret.value();
            } else {
                return undefined;
            }
        }
    }
    return ret;
};

Promise.prototype._migrateCallbacks = function (follower, index) {
    var fulfill = follower._fulfillmentHandlerAt(index);
    var reject = follower._rejectionHandlerAt(index);
    var progress = follower._progressHandlerAt(index);
    var promise = follower._promiseAt(index);
    var receiver = follower._receiverAt(index);
    if (promise instanceof Promise) promise._setIsMigrated();
    if (receiver === undefined) receiver = UNDEFINED_BINDING;
    this._addCallbacks(fulfill, reject, progress, promise, receiver, null);
};

Promise.prototype._addCallbacks = function (
    fulfill,
    reject,
    progress,
    promise,
    receiver,
    domain
) {
    var index = this._length();

    if (index >= 131071 - 5) {
        index = 0;
        this._setLength(0);
    }

    if (index === 0) {
        this._promise0 = promise;
        if (receiver !== undefined) this._receiver0 = receiver;
        if (typeof fulfill === "function" && !this._isCarryingStackTrace()) {
            this._fulfillmentHandler0 =
                domain === null ? fulfill : domain.bind(fulfill);
        }
        if (typeof reject === "function") {
            this._rejectionHandler0 =
                domain === null ? reject : domain.bind(reject);
        }
        if (typeof progress === "function") {
            this._progressHandler0 =
                domain === null ? progress : domain.bind(progress);
        }
    } else {
        var base = index * 5 - 5;
        this[base + 3] = promise;
        this[base + 4] = receiver;
        if (typeof fulfill === "function") {
            this[base + 0] =
                domain === null ? fulfill : domain.bind(fulfill);
        }
        if (typeof reject === "function") {
            this[base + 1] =
                domain === null ? reject : domain.bind(reject);
        }
        if (typeof progress === "function") {
            this[base + 2] =
                domain === null ? progress : domain.bind(progress);
        }
    }
    this._setLength(index + 1);
    return index;
};

Promise.prototype._setProxyHandlers = function (receiver, promiseSlotValue) {
    var index = this._length();

    if (index >= 131071 - 5) {
        index = 0;
        this._setLength(0);
    }
    if (index === 0) {
        this._promise0 = promiseSlotValue;
        this._receiver0 = receiver;
    } else {
        var base = index * 5 - 5;
        this[base + 3] = promiseSlotValue;
        this[base + 4] = receiver;
    }
    this._setLength(index + 1);
};

Promise.prototype._proxyPromiseArray = function (promiseArray, index) {
    this._setProxyHandlers(promiseArray, index);
};

Promise.prototype._resolveCallback = function(value, shouldBind) {
    if (this._isFollowingOrFulfilledOrRejected()) return;
    if (value === this)
        return this._rejectCallback(makeSelfResolutionError(), false, true);
    var maybePromise = tryConvertToPromise(value, this);
    if (!(maybePromise instanceof Promise)) return this._fulfill(value);

    var propagationFlags = 1 | (shouldBind ? 4 : 0);
    this._propagateFrom(maybePromise, propagationFlags);
    var promise = maybePromise._target();
    if (promise._isPending()) {
        var len = this._length();
        for (var i = 0; i < len; ++i) {
            promise._migrateCallbacks(this, i);
        }
        this._setFollowing();
        this._setLength(0);
        this._setFollowee(promise);
    } else if (promise._isFulfilled()) {
        this._fulfillUnchecked(promise._value());
    } else {
        this._rejectUnchecked(promise._reason(),
            promise._getCarriedStackTrace());
    }
};

Promise.prototype._rejectCallback =
function(reason, synchronous, shouldNotMarkOriginatingFromRejection) {
    if (!shouldNotMarkOriginatingFromRejection) {
        util.markAsOriginatingFromRejection(reason);
    }
    var trace = util.ensureErrorObject(reason);
    var hasStack = trace === reason;
    this._attachExtraTrace(trace, synchronous ? hasStack : false);
    this._reject(reason, hasStack ? undefined : trace);
};

Promise.prototype._resolveFromResolver = function (resolver) {
    var promise = this;
    this._captureStackTrace();
    this._pushContext();
    var synchronous = true;
    var r = tryCatch(resolver)(function(value) {
        if (promise === null) return;
        promise._resolveCallback(value);
        promise = null;
    }, function (reason) {
        if (promise === null) return;
        promise._rejectCallback(reason, synchronous);
        promise = null;
    });
    synchronous = false;
    this._popContext();

    if (r !== undefined && r === errorObj && promise !== null) {
        promise._rejectCallback(r.e, true, true);
        promise = null;
    }
};

Promise.prototype._settlePromiseFromHandler = function (
    handler, receiver, value, promise
) {
    if (promise._isRejected()) return;
    promise._pushContext();
    var x;
    if (receiver === APPLY && !this._isRejected()) {
        x = tryCatch(handler).apply(this._boundValue(), value);
    } else {
        x = tryCatch(handler).call(receiver, value);
    }
    promise._popContext();

    if (x === errorObj || x === promise || x === NEXT_FILTER) {
        var err = x === promise ? makeSelfResolutionError() : x.e;
        promise._rejectCallback(err, false, true);
    } else {
        promise._resolveCallback(x);
    }
};

Promise.prototype._target = function() {
    var ret = this;
    while (ret._isFollowing()) ret = ret._followee();
    return ret;
};

Promise.prototype._followee = function() {
    return this._rejectionHandler0;
};

Promise.prototype._setFollowee = function(promise) {
    this._rejectionHandler0 = promise;
};

Promise.prototype._cleanValues = function () {
    if (this._cancellable()) {
        this._cancellationParent = undefined;
    }
};

Promise.prototype._propagateFrom = function (parent, flags) {
    if ((flags & 1) > 0 && parent._cancellable()) {
        this._setCancellable();
        this._cancellationParent = parent;
    }
    if ((flags & 4) > 0 && parent._isBound()) {
        this._setBoundTo(parent._boundTo);
    }
};

Promise.prototype._fulfill = function (value) {
    if (this._isFollowingOrFulfilledOrRejected()) return;
    this._fulfillUnchecked(value);
};

Promise.prototype._reject = function (reason, carriedStackTrace) {
    if (this._isFollowingOrFulfilledOrRejected()) return;
    this._rejectUnchecked(reason, carriedStackTrace);
};

Promise.prototype._settlePromiseAt = function (index) {
    var promise = this._promiseAt(index);
    var isPromise = promise instanceof Promise;

    if (isPromise && promise._isMigrated()) {
        promise._unsetIsMigrated();
        return async.invoke(this._settlePromiseAt, this, index);
    }
    var handler = this._isFulfilled()
        ? this._fulfillmentHandlerAt(index)
        : this._rejectionHandlerAt(index);

    var carriedStackTrace =
        this._isCarryingStackTrace() ? this._getCarriedStackTrace() : undefined;
    var value = this._settledValue;
    var receiver = this._receiverAt(index);
    this._clearCallbackDataAtIndex(index);

    if (typeof handler === "function") {
        if (!isPromise) {
            handler.call(receiver, value, promise);
        } else {
            this._settlePromiseFromHandler(handler, receiver, value, promise);
        }
    } else if (receiver instanceof PromiseArray) {
        if (!receiver._isResolved()) {
            if (this._isFulfilled()) {
                receiver._promiseFulfilled(value, promise);
            }
            else {
                receiver._promiseRejected(value, promise);
            }
        }
    } else if (isPromise) {
        if (this._isFulfilled()) {
            promise._fulfill(value);
        } else {
            promise._reject(value, carriedStackTrace);
        }
    }

    if (index >= 4 && (index & 31) === 4)
        async.invokeLater(this._setLength, this, 0);
};

Promise.prototype._clearCallbackDataAtIndex = function(index) {
    if (index === 0) {
        if (!this._isCarryingStackTrace()) {
            this._fulfillmentHandler0 = undefined;
        }
        this._rejectionHandler0 =
        this._progressHandler0 =
        this._receiver0 =
        this._promise0 = undefined;
    } else {
        var base = index * 5 - 5;
        this[base + 3] =
        this[base + 4] =
        this[base + 0] =
        this[base + 1] =
        this[base + 2] = undefined;
    }
};

Promise.prototype._isSettlePromisesQueued = function () {
    return (this._bitField &
            -1073741824) === -1073741824;
};

Promise.prototype._setSettlePromisesQueued = function () {
    this._bitField = this._bitField | -1073741824;
};

Promise.prototype._unsetSettlePromisesQueued = function () {
    this._bitField = this._bitField & (~-1073741824);
};

Promise.prototype._queueSettlePromises = function() {
    async.settlePromises(this);
    this._setSettlePromisesQueued();
};

Promise.prototype._fulfillUnchecked = function (value) {
    if (value === this) {
        var err = makeSelfResolutionError();
        this._attachExtraTrace(err);
        return this._rejectUnchecked(err, undefined);
    }
    this._setFulfilled();
    this._settledValue = value;
    this._cleanValues();

    if (this._length() > 0) {
        this._queueSettlePromises();
    }
};

Promise.prototype._rejectUncheckedCheckError = function (reason) {
    var trace = util.ensureErrorObject(reason);
    this._rejectUnchecked(reason, trace === reason ? undefined : trace);
};

Promise.prototype._rejectUnchecked = function (reason, trace) {
    if (reason === this) {
        var err = makeSelfResolutionError();
        this._attachExtraTrace(err);
        return this._rejectUnchecked(err);
    }
    this._setRejected();
    this._settledValue = reason;
    this._cleanValues();

    if (this._isFinal()) {
        async.throwLater(function(e) {
            if ("stack" in e) {
                async.invokeFirst(
                    CapturedTrace.unhandledRejection, undefined, e);
            }
            throw e;
        }, trace === undefined ? reason : trace);
        return;
    }

    if (trace !== undefined && trace !== reason) {
        this._setCarriedStackTrace(trace);
    }

    if (this._length() > 0) {
        this._queueSettlePromises();
    } else {
        this._ensurePossibleRejectionHandled();
    }
};

Promise.prototype._settlePromises = function () {
    this._unsetSettlePromisesQueued();
    var len = this._length();
    for (var i = 0; i < len; i++) {
        this._settlePromiseAt(i);
    }
};

util.notEnumerableProp(Promise,
                       "_makeSelfResolutionError",
                       makeSelfResolutionError);

_dereq_("./progress.js")(Promise, PromiseArray);
_dereq_("./method.js")(Promise, INTERNAL, tryConvertToPromise, apiRejection);
_dereq_("./bind.js")(Promise, INTERNAL, tryConvertToPromise);
_dereq_("./finally.js")(Promise, NEXT_FILTER, tryConvertToPromise);
_dereq_("./direct_resolve.js")(Promise);
_dereq_("./synchronous_inspection.js")(Promise);
_dereq_("./join.js")(Promise, PromiseArray, tryConvertToPromise, INTERNAL);
Promise.Promise = Promise;
_dereq_('./map.js')(Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL);
_dereq_('./cancel.js')(Promise);
_dereq_('./using.js')(Promise, apiRejection, tryConvertToPromise, createContext);
_dereq_('./generators.js')(Promise, apiRejection, INTERNAL, tryConvertToPromise);
_dereq_('./nodeify.js')(Promise);
_dereq_('./call_get.js')(Promise);
_dereq_('./props.js')(Promise, PromiseArray, tryConvertToPromise, apiRejection);
_dereq_('./race.js')(Promise, INTERNAL, tryConvertToPromise, apiRejection);
_dereq_('./reduce.js')(Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL);
_dereq_('./settle.js')(Promise, PromiseArray);
_dereq_('./some.js')(Promise, PromiseArray, apiRejection);
_dereq_('./promisify.js')(Promise, INTERNAL);
_dereq_('./any.js')(Promise);
_dereq_('./each.js')(Promise, INTERNAL);
_dereq_('./timers.js')(Promise, INTERNAL);
_dereq_('./filter.js')(Promise, INTERNAL);
                                                         
    util.toFastProperties(Promise);                                          
    util.toFastProperties(Promise.prototype);                                
    function fillTypes(value) {                                              
        var p = new Promise(INTERNAL);                                       
        p._fulfillmentHandler0 = value;                                      
        p._rejectionHandler0 = value;                                        
        p._progressHandler0 = value;                                         
        p._promise0 = value;                                                 
        p._receiver0 = value;                                                
        p._settledValue = value;                                             
    }                                                                        
    // Complete slack tracking, opt out of field-type tracking and           
    // stabilize map                                                         
    fillTypes({a: 1});                                                       
    fillTypes({b: 2});                                                       
    fillTypes({c: 3});                                                       
    fillTypes(1);                                                            
    fillTypes(function(){});                                                 
    fillTypes(undefined);                                                    
    fillTypes(false);                                                        
    fillTypes(new Promise(INTERNAL));                                        
    CapturedTrace.setBounds(async.firstLineError, util.lastLineError);       
    return Promise;                                                          

};

},{"./any.js":1,"./async.js":2,"./bind.js":3,"./call_get.js":5,"./cancel.js":6,"./captured_trace.js":7,"./catch_filter.js":8,"./context.js":9,"./debuggability.js":10,"./direct_resolve.js":11,"./each.js":12,"./errors.js":13,"./filter.js":15,"./finally.js":16,"./generators.js":17,"./join.js":18,"./map.js":19,"./method.js":20,"./nodeify.js":21,"./progress.js":22,"./promise_array.js":24,"./promise_resolver.js":25,"./promisify.js":26,"./props.js":27,"./race.js":29,"./reduce.js":30,"./settle.js":32,"./some.js":33,"./synchronous_inspection.js":34,"./thenables.js":35,"./timers.js":36,"./using.js":37,"./util.js":38}],24:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, tryConvertToPromise,
    apiRejection) {
var util = _dereq_("./util.js");
var isArray = util.isArray;

function toResolutionValue(val) {
    switch(val) {
    case -2: return [];
    case -3: return {};
    }
}

function PromiseArray(values) {
    var promise = this._promise = new Promise(INTERNAL);
    var parent;
    if (values instanceof Promise) {
        parent = values;
        promise._propagateFrom(parent, 1 | 4);
    }
    this._values = values;
    this._length = 0;
    this._totalResolved = 0;
    this._init(undefined, -2);
}
PromiseArray.prototype.length = function () {
    return this._length;
};

PromiseArray.prototype.promise = function () {
    return this._promise;
};

PromiseArray.prototype._init = function init(_, resolveValueIfEmpty) {
    var values = tryConvertToPromise(this._values, this._promise);
    if (values instanceof Promise) {
        values = values._target();
        this._values = values;
        if (values._isFulfilled()) {
            values = values._value();
            if (!isArray(values)) {
                var err = new Promise.TypeError("expecting an array, a promise or a thenable\u000a\u000a    See http://goo.gl/s8MMhc\u000a");
                this.__hardReject__(err);
                return;
            }
        } else if (values._isPending()) {
            values._then(
                init,
                this._reject,
                undefined,
                this,
                resolveValueIfEmpty
           );
            return;
        } else {
            this._reject(values._reason());
            return;
        }
    } else if (!isArray(values)) {
        this._promise._reject(apiRejection("expecting an array, a promise or a thenable\u000a\u000a    See http://goo.gl/s8MMhc\u000a")._reason());
        return;
    }

    if (values.length === 0) {
        if (resolveValueIfEmpty === -5) {
            this._resolveEmptyArray();
        }
        else {
            this._resolve(toResolutionValue(resolveValueIfEmpty));
        }
        return;
    }
    var len = this.getActualLength(values.length);
    this._length = len;
    this._values = this.shouldCopyValues() ? new Array(len) : this._values;
    var promise = this._promise;
    for (var i = 0; i < len; ++i) {
        var isResolved = this._isResolved();
        var maybePromise = tryConvertToPromise(values[i], promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            if (isResolved) {
                maybePromise._ignoreRejections();
            } else if (maybePromise._isPending()) {
                maybePromise._proxyPromiseArray(this, i);
            } else if (maybePromise._isFulfilled()) {
                this._promiseFulfilled(maybePromise._value(), i);
            } else {
                this._promiseRejected(maybePromise._reason(), i);
            }
        } else if (!isResolved) {
            this._promiseFulfilled(maybePromise, i);
        }
    }
};

PromiseArray.prototype._isResolved = function () {
    return this._values === null;
};

PromiseArray.prototype._resolve = function (value) {
    this._values = null;
    this._promise._fulfill(value);
};

PromiseArray.prototype.__hardReject__ =
PromiseArray.prototype._reject = function (reason) {
    this._values = null;
    this._promise._rejectCallback(reason, false, true);
};

PromiseArray.prototype._promiseProgressed = function (progressValue, index) {
    this._promise._progress({
        index: index,
        value: progressValue
    });
};


PromiseArray.prototype._promiseFulfilled = function (value, index) {
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        this._resolve(this._values);
    }
};

PromiseArray.prototype._promiseRejected = function (reason, index) {
    this._totalResolved++;
    this._reject(reason);
};

PromiseArray.prototype.shouldCopyValues = function () {
    return true;
};

PromiseArray.prototype.getActualLength = function (len) {
    return len;
};

return PromiseArray;
};

},{"./util.js":38}],25:[function(_dereq_,module,exports){
"use strict";
var util = _dereq_("./util.js");
var maybeWrapAsError = util.maybeWrapAsError;
var errors = _dereq_("./errors.js");
var TimeoutError = errors.TimeoutError;
var OperationalError = errors.OperationalError;
var haveGetters = util.haveGetters;
var es5 = _dereq_("./es5.js");

function isUntypedError(obj) {
    return obj instanceof Error &&
        es5.getPrototypeOf(obj) === Error.prototype;
}

var rErrorKey = /^(?:name|message|stack|cause)$/;
function wrapAsOperationalError(obj) {
    var ret;
    if (isUntypedError(obj)) {
        ret = new OperationalError(obj);
        ret.name = obj.name;
        ret.message = obj.message;
        ret.stack = obj.stack;
        var keys = es5.keys(obj);
        for (var i = 0; i < keys.length; ++i) {
            var key = keys[i];
            if (!rErrorKey.test(key)) {
                ret[key] = obj[key];
            }
        }
        return ret;
    }
    util.markAsOriginatingFromRejection(obj);
    return obj;
}

function nodebackForPromise(promise) {
    return function(err, value) {
        if (promise === null) return;

        if (err) {
            var wrapped = wrapAsOperationalError(maybeWrapAsError(err));
            promise._attachExtraTrace(wrapped);
            promise._reject(wrapped);
        } else if (arguments.length > 2) {
            var $_len = arguments.length;var args = new Array($_len - 1); for(var $_i = 1; $_i < $_len; ++$_i) {args[$_i - 1] = arguments[$_i];}
            promise._fulfill(args);
        } else {
            promise._fulfill(value);
        }

        promise = null;
    };
}


var PromiseResolver;
if (!haveGetters) {
    PromiseResolver = function (promise) {
        this.promise = promise;
        this.asCallback = nodebackForPromise(promise);
        this.callback = this.asCallback;
    };
}
else {
    PromiseResolver = function (promise) {
        this.promise = promise;
    };
}
if (haveGetters) {
    var prop = {
        get: function() {
            return nodebackForPromise(this.promise);
        }
    };
    es5.defineProperty(PromiseResolver.prototype, "asCallback", prop);
    es5.defineProperty(PromiseResolver.prototype, "callback", prop);
}

PromiseResolver._nodebackForPromise = nodebackForPromise;

PromiseResolver.prototype.toString = function () {
    return "[object PromiseResolver]";
};

PromiseResolver.prototype.resolve =
PromiseResolver.prototype.fulfill = function (value) {
    if (!(this instanceof PromiseResolver)) {
        throw new TypeError("Illegal invocation, resolver resolve/reject must be called within a resolver context. Consider using the promise constructor instead.\u000a\u000a    See http://goo.gl/sdkXL9\u000a");
    }
    this.promise._resolveCallback(value);
};

PromiseResolver.prototype.reject = function (reason) {
    if (!(this instanceof PromiseResolver)) {
        throw new TypeError("Illegal invocation, resolver resolve/reject must be called within a resolver context. Consider using the promise constructor instead.\u000a\u000a    See http://goo.gl/sdkXL9\u000a");
    }
    this.promise._rejectCallback(reason);
};

PromiseResolver.prototype.progress = function (value) {
    if (!(this instanceof PromiseResolver)) {
        throw new TypeError("Illegal invocation, resolver resolve/reject must be called within a resolver context. Consider using the promise constructor instead.\u000a\u000a    See http://goo.gl/sdkXL9\u000a");
    }
    this.promise._progress(value);
};

PromiseResolver.prototype.cancel = function (err) {
    this.promise.cancel(err);
};

PromiseResolver.prototype.timeout = function () {
    this.reject(new TimeoutError("timeout"));
};

PromiseResolver.prototype.isResolved = function () {
    return this.promise.isResolved();
};

PromiseResolver.prototype.toJSON = function () {
    return this.promise.toJSON();
};

module.exports = PromiseResolver;

},{"./errors.js":13,"./es5.js":14,"./util.js":38}],26:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var THIS = {};
var util = _dereq_("./util.js");
var nodebackForPromise = _dereq_("./promise_resolver.js")
    ._nodebackForPromise;
var withAppended = util.withAppended;
var maybeWrapAsError = util.maybeWrapAsError;
var canEvaluate = util.canEvaluate;
var TypeError = _dereq_("./errors").TypeError;
var defaultSuffix = "Async";
var defaultPromisified = {__isPromisified__: true};
var noCopyProps = [
    "arity",    "length",
    "name",
    "arguments",
    "caller",
    "callee",
    "prototype",
    "__isPromisified__"
];
var noCopyPropsPattern = new RegExp("^(?:" + noCopyProps.join("|") + ")$");

var defaultFilter = function(name) {
    return util.isIdentifier(name) &&
        name.charAt(0) !== "_" &&
        name !== "constructor";
};

function propsFilter(key) {
    return !noCopyPropsPattern.test(key);
}

function isPromisified(fn) {
    try {
        return fn.__isPromisified__ === true;
    }
    catch (e) {
        return false;
    }
}

function hasPromisified(obj, key, suffix) {
    var val = util.getDataPropertyOrDefault(obj, key + suffix,
                                            defaultPromisified);
    return val ? isPromisified(val) : false;
}
function checkValid(ret, suffix, suffixRegexp) {
    for (var i = 0; i < ret.length; i += 2) {
        var key = ret[i];
        if (suffixRegexp.test(key)) {
            var keyWithoutAsyncSuffix = key.replace(suffixRegexp, "");
            for (var j = 0; j < ret.length; j += 2) {
                if (ret[j] === keyWithoutAsyncSuffix) {
                    throw new TypeError("Cannot promisify an API that has normal methods with '%s'-suffix\u000a\u000a    See http://goo.gl/iWrZbw\u000a"
                        .replace("%s", suffix));
                }
            }
        }
    }
}

function promisifiableMethods(obj, suffix, suffixRegexp, filter) {
    var keys = util.inheritedDataKeys(obj);
    var ret = [];
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        var value = obj[key];
        var passesDefaultFilter = filter === defaultFilter
            ? true : defaultFilter(key, value, obj);
        if (typeof value === "function" &&
            !isPromisified(value) &&
            !hasPromisified(obj, key, suffix) &&
            filter(key, value, obj, passesDefaultFilter)) {
            ret.push(key, value);
        }
    }
    checkValid(ret, suffix, suffixRegexp);
    return ret;
}

var escapeIdentRegex = function(str) {
    return str.replace(/([$])/, "\\$");
};

var makeNodePromisifiedEval;
if (!true) {
var switchCaseArgumentOrder = function(likelyArgumentCount) {
    var ret = [likelyArgumentCount];
    var min = Math.max(0, likelyArgumentCount - 1 - 3);
    for(var i = likelyArgumentCount - 1; i >= min; --i) {
        ret.push(i);
    }
    for(var i = likelyArgumentCount + 1; i <= 3; ++i) {
        ret.push(i);
    }
    return ret;
};

var argumentSequence = function(argumentCount) {
    return util.filledRange(argumentCount, "_arg", "");
};

var parameterDeclaration = function(parameterCount) {
    return util.filledRange(
        Math.max(parameterCount, 3), "_arg", "");
};

var parameterCount = function(fn) {
    if (typeof fn.length === "number") {
        return Math.max(Math.min(fn.length, 1023 + 1), 0);
    }
    return 0;
};

makeNodePromisifiedEval =
function(callback, receiver, originalName, fn) {
    var newParameterCount = Math.max(0, parameterCount(fn) - 1);
    var argumentOrder = switchCaseArgumentOrder(newParameterCount);
    var shouldProxyThis = typeof callback === "string" || receiver === THIS;

    function generateCallForArgumentCount(count) {
        var args = argumentSequence(count).join(", ");
        var comma = count > 0 ? ", " : "";
        var ret;
        if (shouldProxyThis) {
            ret = "ret = callback.call(this, {{args}}, nodeback); break;\n";
        } else {
            ret = receiver === undefined
                ? "ret = callback({{args}}, nodeback); break;\n"
                : "ret = callback.call(receiver, {{args}}, nodeback); break;\n";
        }
        return ret.replace("{{args}}", args).replace(", ", comma);
    }

    function generateArgumentSwitchCase() {
        var ret = "";
        for (var i = 0; i < argumentOrder.length; ++i) {
            ret += "case " + argumentOrder[i] +":" +
                generateCallForArgumentCount(argumentOrder[i]);
        }

        ret += "                                                             \n\
        default:                                                             \n\
            var args = new Array(len + 1);                                   \n\
            var i = 0;                                                       \n\
            for (var i = 0; i < len; ++i) {                                  \n\
               args[i] = arguments[i];                                       \n\
            }                                                                \n\
            args[i] = nodeback;                                              \n\
            [CodeForCall]                                                    \n\
            break;                                                           \n\
        ".replace("[CodeForCall]", (shouldProxyThis
                                ? "ret = callback.apply(this, args);\n"
                                : "ret = callback.apply(receiver, args);\n"));
        return ret;
    }

    var getFunctionCode = typeof callback === "string"
                                ? ("this != null ? this['"+callback+"'] : fn")
                                : "fn";

    return new Function("Promise",
                        "fn",
                        "receiver",
                        "withAppended",
                        "maybeWrapAsError",
                        "nodebackForPromise",
                        "tryCatch",
                        "errorObj",
                        "notEnumerableProp",
                        "INTERNAL","'use strict';                            \n\
        var ret = function (Parameters) {                                    \n\
            'use strict';                                                    \n\
            var len = arguments.length;                                      \n\
            var promise = new Promise(INTERNAL);                             \n\
            promise._captureStackTrace();                                    \n\
            var nodeback = nodebackForPromise(promise);                      \n\
            var ret;                                                         \n\
            var callback = tryCatch([GetFunctionCode]);                      \n\
            switch(len) {                                                    \n\
                [CodeForSwitchCase]                                          \n\
            }                                                                \n\
            if (ret === errorObj) {                                          \n\
                promise._rejectCallback(maybeWrapAsError(ret.e), true, true);\n\
            }                                                                \n\
            return promise;                                                  \n\
        };                                                                   \n\
        notEnumerableProp(ret, '__isPromisified__', true);                   \n\
        return ret;                                                          \n\
        "
        .replace("Parameters", parameterDeclaration(newParameterCount))
        .replace("[CodeForSwitchCase]", generateArgumentSwitchCase())
        .replace("[GetFunctionCode]", getFunctionCode))(
            Promise,
            fn,
            receiver,
            withAppended,
            maybeWrapAsError,
            nodebackForPromise,
            util.tryCatch,
            util.errorObj,
            util.notEnumerableProp,
            INTERNAL
        );
};
}

function makeNodePromisifiedClosure(callback, receiver, _, fn) {
    var defaultThis = (function() {return this;})();
    var method = callback;
    if (typeof method === "string") {
        callback = fn;
    }
    function promisified() {
        var _receiver = receiver;
        if (receiver === THIS) _receiver = this;
        var promise = new Promise(INTERNAL);
        promise._captureStackTrace();
        var cb = typeof method === "string" && this !== defaultThis
            ? this[method] : callback;
        var fn = nodebackForPromise(promise);
        try {
            cb.apply(_receiver, withAppended(arguments, fn));
        } catch(e) {
            promise._rejectCallback(maybeWrapAsError(e), true, true);
        }
        return promise;
    }
    util.notEnumerableProp(promisified, "__isPromisified__", true);
    return promisified;
}

var makeNodePromisified = canEvaluate
    ? makeNodePromisifiedEval
    : makeNodePromisifiedClosure;

function promisifyAll(obj, suffix, filter, promisifier) {
    var suffixRegexp = new RegExp(escapeIdentRegex(suffix) + "$");
    var methods =
        promisifiableMethods(obj, suffix, suffixRegexp, filter);

    for (var i = 0, len = methods.length; i < len; i+= 2) {
        var key = methods[i];
        var fn = methods[i+1];
        var promisifiedKey = key + suffix;
        if (promisifier === makeNodePromisified) {
            obj[promisifiedKey] =
                makeNodePromisified(key, THIS, key, fn, suffix);
        } else {
            var promisified = promisifier(fn, function() {
                return makeNodePromisified(key, THIS, key, fn, suffix);
            });
            util.notEnumerableProp(promisified, "__isPromisified__", true);
            obj[promisifiedKey] = promisified;
        }
    }
    util.toFastProperties(obj);
    return obj;
}

function promisify(callback, receiver) {
    return makeNodePromisified(callback, receiver, undefined, callback);
}

Promise.promisify = function (fn, receiver) {
    if (typeof fn !== "function") {
        throw new TypeError("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    }
    if (isPromisified(fn)) {
        return fn;
    }
    var ret = promisify(fn, arguments.length < 2 ? THIS : receiver);
    util.copyDescriptors(fn, ret, propsFilter);
    return ret;
};

Promise.promisifyAll = function (target, options) {
    if (typeof target !== "function" && typeof target !== "object") {
        throw new TypeError("the target of promisifyAll must be an object or a function\u000a\u000a    See http://goo.gl/9ITlV0\u000a");
    }
    options = Object(options);
    var suffix = options.suffix;
    if (typeof suffix !== "string") suffix = defaultSuffix;
    var filter = options.filter;
    if (typeof filter !== "function") filter = defaultFilter;
    var promisifier = options.promisifier;
    if (typeof promisifier !== "function") promisifier = makeNodePromisified;

    if (!util.isIdentifier(suffix)) {
        throw new RangeError("suffix must be a valid identifier\u000a\u000a    See http://goo.gl/8FZo5V\u000a");
    }

    var keys = util.inheritedDataKeys(target);
    for (var i = 0; i < keys.length; ++i) {
        var value = target[keys[i]];
        if (keys[i] !== "constructor" &&
            util.isClass(value)) {
            promisifyAll(value.prototype, suffix, filter, promisifier);
            promisifyAll(value, suffix, filter, promisifier);
        }
    }

    return promisifyAll(target, suffix, filter, promisifier);
};
};


},{"./errors":13,"./promise_resolver.js":25,"./util.js":38}],27:[function(_dereq_,module,exports){
"use strict";
module.exports = function(
    Promise, PromiseArray, tryConvertToPromise, apiRejection) {
var util = _dereq_("./util.js");
var isObject = util.isObject;
var es5 = _dereq_("./es5.js");

function PropertiesPromiseArray(obj) {
    var keys = es5.keys(obj);
    var len = keys.length;
    var values = new Array(len * 2);
    for (var i = 0; i < len; ++i) {
        var key = keys[i];
        values[i] = obj[key];
        values[i + len] = key;
    }
    this.constructor$(values);
}
util.inherits(PropertiesPromiseArray, PromiseArray);

PropertiesPromiseArray.prototype._init = function () {
    this._init$(undefined, -3) ;
};

PropertiesPromiseArray.prototype._promiseFulfilled = function (value, index) {
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        var val = {};
        var keyOffset = this.length();
        for (var i = 0, len = this.length(); i < len; ++i) {
            val[this._values[i + keyOffset]] = this._values[i];
        }
        this._resolve(val);
    }
};

PropertiesPromiseArray.prototype._promiseProgressed = function (value, index) {
    this._promise._progress({
        key: this._values[index + this.length()],
        value: value
    });
};

PropertiesPromiseArray.prototype.shouldCopyValues = function () {
    return false;
};

PropertiesPromiseArray.prototype.getActualLength = function (len) {
    return len >> 1;
};

function props(promises) {
    var ret;
    var castValue = tryConvertToPromise(promises);

    if (!isObject(castValue)) {
        return apiRejection("cannot await properties of a non-object\u000a\u000a    See http://goo.gl/OsFKC8\u000a");
    } else if (castValue instanceof Promise) {
        ret = castValue._then(
            Promise.props, undefined, undefined, undefined, undefined);
    } else {
        ret = new PropertiesPromiseArray(castValue).promise();
    }

    if (castValue instanceof Promise) {
        ret._propagateFrom(castValue, 4);
    }
    return ret;
}

Promise.prototype.props = function () {
    return props(this);
};

Promise.props = function (promises) {
    return props(promises);
};
};

},{"./es5.js":14,"./util.js":38}],28:[function(_dereq_,module,exports){
"use strict";
function arrayMove(src, srcIndex, dst, dstIndex, len) {
    for (var j = 0; j < len; ++j) {
        dst[j + dstIndex] = src[j + srcIndex];
        src[j + srcIndex] = void 0;
    }
}

function Queue(capacity) {
    this._capacity = capacity;
    this._length = 0;
    this._front = 0;
}

Queue.prototype._willBeOverCapacity = function (size) {
    return this._capacity < size;
};

Queue.prototype._pushOne = function (arg) {
    var length = this.length();
    this._checkCapacity(length + 1);
    var i = (this._front + length) & (this._capacity - 1);
    this[i] = arg;
    this._length = length + 1;
};

Queue.prototype._unshiftOne = function(value) {
    var capacity = this._capacity;
    this._checkCapacity(this.length() + 1);
    var front = this._front;
    var i = (((( front - 1 ) &
                    ( capacity - 1) ) ^ capacity ) - capacity );
    this[i] = value;
    this._front = i;
    this._length = this.length() + 1;
};

Queue.prototype.unshift = function(fn, receiver, arg) {
    this._unshiftOne(arg);
    this._unshiftOne(receiver);
    this._unshiftOne(fn);
};

Queue.prototype.push = function (fn, receiver, arg) {
    var length = this.length() + 3;
    if (this._willBeOverCapacity(length)) {
        this._pushOne(fn);
        this._pushOne(receiver);
        this._pushOne(arg);
        return;
    }
    var j = this._front + length - 3;
    this._checkCapacity(length);
    var wrapMask = this._capacity - 1;
    this[(j + 0) & wrapMask] = fn;
    this[(j + 1) & wrapMask] = receiver;
    this[(j + 2) & wrapMask] = arg;
    this._length = length;
};

Queue.prototype.shift = function () {
    var front = this._front,
        ret = this[front];

    this[front] = undefined;
    this._front = (front + 1) & (this._capacity - 1);
    this._length--;
    return ret;
};

Queue.prototype.length = function () {
    return this._length;
};

Queue.prototype._checkCapacity = function (size) {
    if (this._capacity < size) {
        this._resizeTo(this._capacity << 1);
    }
};

Queue.prototype._resizeTo = function (capacity) {
    var oldCapacity = this._capacity;
    this._capacity = capacity;
    var front = this._front;
    var length = this._length;
    var moveItemsCount = (front + length) & (oldCapacity - 1);
    arrayMove(this, 0, this, oldCapacity, moveItemsCount);
};

module.exports = Queue;

},{}],29:[function(_dereq_,module,exports){
"use strict";
module.exports = function(
    Promise, INTERNAL, tryConvertToPromise, apiRejection) {
var isArray = _dereq_("./util.js").isArray;

var raceLater = function (promise) {
    return promise.then(function(array) {
        return race(array, promise);
    });
};

function race(promises, parent) {
    var maybePromise = tryConvertToPromise(promises);

    if (maybePromise instanceof Promise) {
        return raceLater(maybePromise);
    } else if (!isArray(promises)) {
        return apiRejection("expecting an array, a promise or a thenable\u000a\u000a    See http://goo.gl/s8MMhc\u000a");
    }

    var ret = new Promise(INTERNAL);
    if (parent !== undefined) {
        ret._propagateFrom(parent, 4 | 1);
    }
    var fulfill = ret._fulfill;
    var reject = ret._reject;
    for (var i = 0, len = promises.length; i < len; ++i) {
        var val = promises[i];

        if (val === undefined && !(i in promises)) {
            continue;
        }

        Promise.cast(val)._then(fulfill, reject, undefined, ret, null);
    }
    return ret;
}

Promise.race = function (promises) {
    return race(promises, undefined);
};

Promise.prototype.race = function () {
    return race(this, undefined);
};

};

},{"./util.js":38}],30:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          PromiseArray,
                          apiRejection,
                          tryConvertToPromise,
                          INTERNAL) {
var getDomain = Promise._getDomain;
var async = _dereq_("./async.js");
var util = _dereq_("./util.js");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
function ReductionPromiseArray(promises, fn, accum, _each) {
    this.constructor$(promises);
    this._promise._captureStackTrace();
    this._preservedValues = _each === INTERNAL ? [] : null;
    this._zerothIsAccum = (accum === undefined);
    this._gotAccum = false;
    this._reducingIndex = (this._zerothIsAccum ? 1 : 0);
    this._valuesPhase = undefined;
    var maybePromise = tryConvertToPromise(accum, this._promise);
    var rejected = false;
    var isPromise = maybePromise instanceof Promise;
    if (isPromise) {
        maybePromise = maybePromise._target();
        if (maybePromise._isPending()) {
            maybePromise._proxyPromiseArray(this, -1);
        } else if (maybePromise._isFulfilled()) {
            accum = maybePromise._value();
            this._gotAccum = true;
        } else {
            this._reject(maybePromise._reason());
            rejected = true;
        }
    }
    if (!(isPromise || this._zerothIsAccum)) this._gotAccum = true;
    var domain = getDomain();
    this._callback = domain === null ? fn : domain.bind(fn);
    this._accum = accum;
    if (!rejected) async.invoke(init, this, undefined);
}
function init() {
    this._init$(undefined, -5);
}
util.inherits(ReductionPromiseArray, PromiseArray);

ReductionPromiseArray.prototype._init = function () {};

ReductionPromiseArray.prototype._resolveEmptyArray = function () {
    if (this._gotAccum || this._zerothIsAccum) {
        this._resolve(this._preservedValues !== null
                        ? [] : this._accum);
    }
};

ReductionPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var values = this._values;
    values[index] = value;
    var length = this.length();
    var preservedValues = this._preservedValues;
    var isEach = preservedValues !== null;
    var gotAccum = this._gotAccum;
    var valuesPhase = this._valuesPhase;
    var valuesPhaseIndex;
    if (!valuesPhase) {
        valuesPhase = this._valuesPhase = new Array(length);
        for (valuesPhaseIndex=0; valuesPhaseIndex<length; ++valuesPhaseIndex) {
            valuesPhase[valuesPhaseIndex] = 0;
        }
    }
    valuesPhaseIndex = valuesPhase[index];

    if (index === 0 && this._zerothIsAccum) {
        this._accum = value;
        this._gotAccum = gotAccum = true;
        valuesPhase[index] = ((valuesPhaseIndex === 0)
            ? 1 : 2);
    } else if (index === -1) {
        this._accum = value;
        this._gotAccum = gotAccum = true;
    } else {
        if (valuesPhaseIndex === 0) {
            valuesPhase[index] = 1;
        } else {
            valuesPhase[index] = 2;
            this._accum = value;
        }
    }
    if (!gotAccum) return;

    var callback = this._callback;
    var receiver = this._promise._boundValue();
    var ret;

    for (var i = this._reducingIndex; i < length; ++i) {
        valuesPhaseIndex = valuesPhase[i];
        if (valuesPhaseIndex === 2) {
            this._reducingIndex = i + 1;
            continue;
        }
        if (valuesPhaseIndex !== 1) return;
        value = values[i];
        this._promise._pushContext();
        if (isEach) {
            preservedValues.push(value);
            ret = tryCatch(callback).call(receiver, value, i, length);
        }
        else {
            ret = tryCatch(callback)
                .call(receiver, this._accum, value, i, length);
        }
        this._promise._popContext();

        if (ret === errorObj) return this._reject(ret.e);

        var maybePromise = tryConvertToPromise(ret, this._promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            if (maybePromise._isPending()) {
                valuesPhase[i] = 4;
                return maybePromise._proxyPromiseArray(this, i);
            } else if (maybePromise._isFulfilled()) {
                ret = maybePromise._value();
            } else {
                return this._reject(maybePromise._reason());
            }
        }

        this._reducingIndex = i + 1;
        this._accum = ret;
    }

    this._resolve(isEach ? preservedValues : this._accum);
};

function reduce(promises, fn, initialValue, _each) {
    if (typeof fn !== "function") return apiRejection("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    var array = new ReductionPromiseArray(promises, fn, initialValue, _each);
    return array.promise();
}

Promise.prototype.reduce = function (fn, initialValue) {
    return reduce(this, fn, initialValue, null);
};

Promise.reduce = function (promises, fn, initialValue, _each) {
    return reduce(promises, fn, initialValue, _each);
};
};

},{"./async.js":2,"./util.js":38}],31:[function(_dereq_,module,exports){
"use strict";
var schedule;
var util = _dereq_("./util");
var noAsyncScheduler = function() {
    throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/m3OTXk\u000a");
};
if (util.isNode && typeof MutationObserver === "undefined") {
    var GlobalSetImmediate = global.setImmediate;
    var ProcessNextTick = process.nextTick;
    schedule = util.isRecentNode
                ? function(fn) { GlobalSetImmediate.call(global, fn); }
                : function(fn) { ProcessNextTick.call(process, fn); };
} else if ((typeof MutationObserver !== "undefined") &&
          !(typeof window !== "undefined" &&
            window.navigator &&
            window.navigator.standalone)) {
    schedule = function(fn) {
        var div = document.createElement("div");
        var observer = new MutationObserver(fn);
        observer.observe(div, {attributes: true});
        return function() { div.classList.toggle("foo"); };
    };
    schedule.isStatic = true;
} else if (typeof setImmediate !== "undefined") {
    schedule = function (fn) {
        setImmediate(fn);
    };
} else if (typeof setTimeout !== "undefined") {
    schedule = function (fn) {
        setTimeout(fn, 0);
    };
} else {
    schedule = noAsyncScheduler;
}
module.exports = schedule;

},{"./util":38}],32:[function(_dereq_,module,exports){
"use strict";
module.exports =
    function(Promise, PromiseArray) {
var PromiseInspection = Promise.PromiseInspection;
var util = _dereq_("./util.js");

function SettledPromiseArray(values) {
    this.constructor$(values);
}
util.inherits(SettledPromiseArray, PromiseArray);

SettledPromiseArray.prototype._promiseResolved = function (index, inspection) {
    this._values[index] = inspection;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        this._resolve(this._values);
    }
};

SettledPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var ret = new PromiseInspection();
    ret._bitField = 268435456;
    ret._settledValue = value;
    this._promiseResolved(index, ret);
};
SettledPromiseArray.prototype._promiseRejected = function (reason, index) {
    var ret = new PromiseInspection();
    ret._bitField = 134217728;
    ret._settledValue = reason;
    this._promiseResolved(index, ret);
};

Promise.settle = function (promises) {
    return new SettledPromiseArray(promises).promise();
};

Promise.prototype.settle = function () {
    return new SettledPromiseArray(this).promise();
};
};

},{"./util.js":38}],33:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, PromiseArray, apiRejection) {
var util = _dereq_("./util.js");
var RangeError = _dereq_("./errors.js").RangeError;
var AggregateError = _dereq_("./errors.js").AggregateError;
var isArray = util.isArray;


function SomePromiseArray(values) {
    this.constructor$(values);
    this._howMany = 0;
    this._unwrap = false;
    this._initialized = false;
}
util.inherits(SomePromiseArray, PromiseArray);

SomePromiseArray.prototype._init = function () {
    if (!this._initialized) {
        return;
    }
    if (this._howMany === 0) {
        this._resolve([]);
        return;
    }
    this._init$(undefined, -5);
    var isArrayResolved = isArray(this._values);
    if (!this._isResolved() &&
        isArrayResolved &&
        this._howMany > this._canPossiblyFulfill()) {
        this._reject(this._getRangeError(this.length()));
    }
};

SomePromiseArray.prototype.init = function () {
    this._initialized = true;
    this._init();
};

SomePromiseArray.prototype.setUnwrap = function () {
    this._unwrap = true;
};

SomePromiseArray.prototype.howMany = function () {
    return this._howMany;
};

SomePromiseArray.prototype.setHowMany = function (count) {
    this._howMany = count;
};

SomePromiseArray.prototype._promiseFulfilled = function (value) {
    this._addFulfilled(value);
    if (this._fulfilled() === this.howMany()) {
        this._values.length = this.howMany();
        if (this.howMany() === 1 && this._unwrap) {
            this._resolve(this._values[0]);
        } else {
            this._resolve(this._values);
        }
    }

};
SomePromiseArray.prototype._promiseRejected = function (reason) {
    this._addRejected(reason);
    if (this.howMany() > this._canPossiblyFulfill()) {
        var e = new AggregateError();
        for (var i = this.length(); i < this._values.length; ++i) {
            e.push(this._values[i]);
        }
        this._reject(e);
    }
};

SomePromiseArray.prototype._fulfilled = function () {
    return this._totalResolved;
};

SomePromiseArray.prototype._rejected = function () {
    return this._values.length - this.length();
};

SomePromiseArray.prototype._addRejected = function (reason) {
    this._values.push(reason);
};

SomePromiseArray.prototype._addFulfilled = function (value) {
    this._values[this._totalResolved++] = value;
};

SomePromiseArray.prototype._canPossiblyFulfill = function () {
    return this.length() - this._rejected();
};

SomePromiseArray.prototype._getRangeError = function (count) {
    var message = "Input array must contain at least " +
            this._howMany + " items but contains only " + count + " items";
    return new RangeError(message);
};

SomePromiseArray.prototype._resolveEmptyArray = function () {
    this._reject(this._getRangeError(0));
};

function some(promises, howMany) {
    if ((howMany | 0) !== howMany || howMany < 0) {
        return apiRejection("expecting a positive integer\u000a\u000a    See http://goo.gl/1wAmHx\u000a");
    }
    var ret = new SomePromiseArray(promises);
    var promise = ret.promise();
    ret.setHowMany(howMany);
    ret.init();
    return promise;
}

Promise.some = function (promises, howMany) {
    return some(promises, howMany);
};

Promise.prototype.some = function (howMany) {
    return some(this, howMany);
};

Promise._SomePromiseArray = SomePromiseArray;
};

},{"./errors.js":13,"./util.js":38}],34:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
function PromiseInspection(promise) {
    if (promise !== undefined) {
        promise = promise._target();
        this._bitField = promise._bitField;
        this._settledValue = promise._settledValue;
    }
    else {
        this._bitField = 0;
        this._settledValue = undefined;
    }
}

PromiseInspection.prototype.value = function () {
    if (!this.isFulfilled()) {
        throw new TypeError("cannot get fulfillment value of a non-fulfilled promise\u000a\u000a    See http://goo.gl/hc1DLj\u000a");
    }
    return this._settledValue;
};

PromiseInspection.prototype.error =
PromiseInspection.prototype.reason = function () {
    if (!this.isRejected()) {
        throw new TypeError("cannot get rejection reason of a non-rejected promise\u000a\u000a    See http://goo.gl/hPuiwB\u000a");
    }
    return this._settledValue;
};

PromiseInspection.prototype.isFulfilled =
Promise.prototype._isFulfilled = function () {
    return (this._bitField & 268435456) > 0;
};

PromiseInspection.prototype.isRejected =
Promise.prototype._isRejected = function () {
    return (this._bitField & 134217728) > 0;
};

PromiseInspection.prototype.isPending =
Promise.prototype._isPending = function () {
    return (this._bitField & 402653184) === 0;
};

PromiseInspection.prototype.isResolved =
Promise.prototype._isResolved = function () {
    return (this._bitField & 402653184) > 0;
};

Promise.prototype.isPending = function() {
    return this._target()._isPending();
};

Promise.prototype.isRejected = function() {
    return this._target()._isRejected();
};

Promise.prototype.isFulfilled = function() {
    return this._target()._isFulfilled();
};

Promise.prototype.isResolved = function() {
    return this._target()._isResolved();
};

Promise.prototype._value = function() {
    return this._settledValue;
};

Promise.prototype._reason = function() {
    this._unsetRejectionIsUnhandled();
    return this._settledValue;
};

Promise.prototype.value = function() {
    var target = this._target();
    if (!target.isFulfilled()) {
        throw new TypeError("cannot get fulfillment value of a non-fulfilled promise\u000a\u000a    See http://goo.gl/hc1DLj\u000a");
    }
    return target._settledValue;
};

Promise.prototype.reason = function() {
    var target = this._target();
    if (!target.isRejected()) {
        throw new TypeError("cannot get rejection reason of a non-rejected promise\u000a\u000a    See http://goo.gl/hPuiwB\u000a");
    }
    target._unsetRejectionIsUnhandled();
    return target._settledValue;
};


Promise.PromiseInspection = PromiseInspection;
};

},{}],35:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var util = _dereq_("./util.js");
var errorObj = util.errorObj;
var isObject = util.isObject;

function tryConvertToPromise(obj, context) {
    if (isObject(obj)) {
        if (obj instanceof Promise) {
            return obj;
        }
        else if (isAnyBluebirdPromise(obj)) {
            var ret = new Promise(INTERNAL);
            obj._then(
                ret._fulfillUnchecked,
                ret._rejectUncheckedCheckError,
                ret._progressUnchecked,
                ret,
                null
            );
            return ret;
        }
        var then = util.tryCatch(getThen)(obj);
        if (then === errorObj) {
            if (context) context._pushContext();
            var ret = Promise.reject(then.e);
            if (context) context._popContext();
            return ret;
        } else if (typeof then === "function") {
            return doThenable(obj, then, context);
        }
    }
    return obj;
}

function getThen(obj) {
    return obj.then;
}

var hasProp = {}.hasOwnProperty;
function isAnyBluebirdPromise(obj) {
    return hasProp.call(obj, "_promise0");
}

function doThenable(x, then, context) {
    var promise = new Promise(INTERNAL);
    var ret = promise;
    if (context) context._pushContext();
    promise._captureStackTrace();
    if (context) context._popContext();
    var synchronous = true;
    var result = util.tryCatch(then).call(x,
                                        resolveFromThenable,
                                        rejectFromThenable,
                                        progressFromThenable);
    synchronous = false;
    if (promise && result === errorObj) {
        promise._rejectCallback(result.e, true, true);
        promise = null;
    }

    function resolveFromThenable(value) {
        if (!promise) return;
        promise._resolveCallback(value);
        promise = null;
    }

    function rejectFromThenable(reason) {
        if (!promise) return;
        promise._rejectCallback(reason, synchronous, true);
        promise = null;
    }

    function progressFromThenable(value) {
        if (!promise) return;
        if (typeof promise._progress === "function") {
            promise._progress(value);
        }
    }
    return ret;
}

return tryConvertToPromise;
};

},{"./util.js":38}],36:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var util = _dereq_("./util.js");
var TimeoutError = Promise.TimeoutError;

var afterTimeout = function (promise, message) {
    if (!promise.isPending()) return;
    
    var err;
    if(!util.isPrimitive(message) && (message instanceof Error)) {
        err = message;
    } else {
        if (typeof message !== "string") {
            message = "operation timed out";
        }
        err = new TimeoutError(message);
    }
    util.markAsOriginatingFromRejection(err);
    promise._attachExtraTrace(err);
    promise._cancel(err);
};

var afterValue = function(value) { return delay(+this).thenReturn(value); };
var delay = Promise.delay = function (value, ms) {
    if (ms === undefined) {
        ms = value;
        value = undefined;
        var ret = new Promise(INTERNAL);
        setTimeout(function() { ret._fulfill(); }, ms);
        return ret;
    }
    ms = +ms;
    return Promise.resolve(value)._then(afterValue, null, null, ms, undefined);
};

Promise.prototype.delay = function (ms) {
    return delay(this, ms);
};

function successClear(value) {
    var handle = this;
    if (handle instanceof Number) handle = +handle;
    clearTimeout(handle);
    return value;
}

function failureClear(reason) {
    var handle = this;
    if (handle instanceof Number) handle = +handle;
    clearTimeout(handle);
    throw reason;
}

Promise.prototype.timeout = function (ms, message) {
    ms = +ms;
    var ret = this.then().cancellable();
    ret._cancellationParent = this;
    var handle = setTimeout(function timeoutTimeout() {
        afterTimeout(ret, message);
    }, ms);
    return ret._then(successClear, failureClear, undefined, handle, undefined);
};

};

},{"./util.js":38}],37:[function(_dereq_,module,exports){
"use strict";
module.exports = function (Promise, apiRejection, tryConvertToPromise,
    createContext) {
    var TypeError = _dereq_("./errors.js").TypeError;
    var inherits = _dereq_("./util.js").inherits;
    var PromiseInspection = Promise.PromiseInspection;

    function inspectionMapper(inspections) {
        var len = inspections.length;
        for (var i = 0; i < len; ++i) {
            var inspection = inspections[i];
            if (inspection.isRejected()) {
                return Promise.reject(inspection.error());
            }
            inspections[i] = inspection._settledValue;
        }
        return inspections;
    }

    function thrower(e) {
        setTimeout(function(){throw e;}, 0);
    }

    function castPreservingDisposable(thenable) {
        var maybePromise = tryConvertToPromise(thenable);
        if (maybePromise !== thenable &&
            typeof thenable._isDisposable === "function" &&
            typeof thenable._getDisposer === "function" &&
            thenable._isDisposable()) {
            maybePromise._setDisposable(thenable._getDisposer());
        }
        return maybePromise;
    }
    function dispose(resources, inspection) {
        var i = 0;
        var len = resources.length;
        var ret = Promise.defer();
        function iterator() {
            if (i >= len) return ret.resolve();
            var maybePromise = castPreservingDisposable(resources[i++]);
            if (maybePromise instanceof Promise &&
                maybePromise._isDisposable()) {
                try {
                    maybePromise = tryConvertToPromise(
                        maybePromise._getDisposer().tryDispose(inspection),
                        resources.promise);
                } catch (e) {
                    return thrower(e);
                }
                if (maybePromise instanceof Promise) {
                    return maybePromise._then(iterator, thrower,
                                              null, null, null);
                }
            }
            iterator();
        }
        iterator();
        return ret.promise;
    }

    function disposerSuccess(value) {
        var inspection = new PromiseInspection();
        inspection._settledValue = value;
        inspection._bitField = 268435456;
        return dispose(this, inspection).thenReturn(value);
    }

    function disposerFail(reason) {
        var inspection = new PromiseInspection();
        inspection._settledValue = reason;
        inspection._bitField = 134217728;
        return dispose(this, inspection).thenThrow(reason);
    }

    function Disposer(data, promise, context) {
        this._data = data;
        this._promise = promise;
        this._context = context;
    }

    Disposer.prototype.data = function () {
        return this._data;
    };

    Disposer.prototype.promise = function () {
        return this._promise;
    };

    Disposer.prototype.resource = function () {
        if (this.promise().isFulfilled()) {
            return this.promise().value();
        }
        return null;
    };

    Disposer.prototype.tryDispose = function(inspection) {
        var resource = this.resource();
        var context = this._context;
        if (context !== undefined) context._pushContext();
        var ret = resource !== null
            ? this.doDispose(resource, inspection) : null;
        if (context !== undefined) context._popContext();
        this._promise._unsetDisposable();
        this._data = null;
        return ret;
    };

    Disposer.isDisposer = function (d) {
        return (d != null &&
                typeof d.resource === "function" &&
                typeof d.tryDispose === "function");
    };

    function FunctionDisposer(fn, promise, context) {
        this.constructor$(fn, promise, context);
    }
    inherits(FunctionDisposer, Disposer);

    FunctionDisposer.prototype.doDispose = function (resource, inspection) {
        var fn = this.data();
        return fn.call(resource, resource, inspection);
    };

    function maybeUnwrapDisposer(value) {
        if (Disposer.isDisposer(value)) {
            this.resources[this.index]._setDisposable(value);
            return value.promise();
        }
        return value;
    }

    Promise.using = function () {
        var len = arguments.length;
        if (len < 2) return apiRejection(
                        "you must pass at least 2 arguments to Promise.using");
        var fn = arguments[len - 1];
        if (typeof fn !== "function") return apiRejection("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");

        var input;
        var spreadArgs = true;
        if (len === 2 && Array.isArray(arguments[0])) {
            input = arguments[0];
            len = input.length;
            spreadArgs = false;
        } else {
            input = arguments;
            len--;
        }
        var resources = new Array(len);
        for (var i = 0; i < len; ++i) {
            var resource = input[i];
            if (Disposer.isDisposer(resource)) {
                var disposer = resource;
                resource = resource.promise();
                resource._setDisposable(disposer);
            } else {
                var maybePromise = tryConvertToPromise(resource);
                if (maybePromise instanceof Promise) {
                    resource =
                        maybePromise._then(maybeUnwrapDisposer, null, null, {
                            resources: resources,
                            index: i
                    }, undefined);
                }
            }
            resources[i] = resource;
        }

        var promise = Promise.settle(resources)
            .then(inspectionMapper)
            .then(function(vals) {
                promise._pushContext();
                var ret;
                try {
                    ret = spreadArgs
                        ? fn.apply(undefined, vals) : fn.call(undefined,  vals);
                } finally {
                    promise._popContext();
                }
                return ret;
            })
            ._then(
                disposerSuccess, disposerFail, undefined, resources, undefined);
        resources.promise = promise;
        return promise;
    };

    Promise.prototype._setDisposable = function (disposer) {
        this._bitField = this._bitField | 262144;
        this._disposer = disposer;
    };

    Promise.prototype._isDisposable = function () {
        return (this._bitField & 262144) > 0;
    };

    Promise.prototype._getDisposer = function () {
        return this._disposer;
    };

    Promise.prototype._unsetDisposable = function () {
        this._bitField = this._bitField & (~262144);
        this._disposer = undefined;
    };

    Promise.prototype.disposer = function (fn) {
        if (typeof fn === "function") {
            return new FunctionDisposer(fn, this, createContext());
        }
        throw new TypeError();
    };

};

},{"./errors.js":13,"./util.js":38}],38:[function(_dereq_,module,exports){
"use strict";
var es5 = _dereq_("./es5.js");
var canEvaluate = typeof navigator == "undefined";
var haveGetters = (function(){
    try {
        var o = {};
        es5.defineProperty(o, "f", {
            get: function () {
                return 3;
            }
        });
        return o.f === 3;
    }
    catch (e) {
        return false;
    }

})();

var errorObj = {e: {}};
var tryCatchTarget;
function tryCatcher() {
    try {
        var target = tryCatchTarget;
        tryCatchTarget = null;
        return target.apply(this, arguments);
    } catch (e) {
        errorObj.e = e;
        return errorObj;
    }
}
function tryCatch(fn) {
    tryCatchTarget = fn;
    return tryCatcher;
}

var inherits = function(Child, Parent) {
    var hasProp = {}.hasOwnProperty;

    function T() {
        this.constructor = Child;
        this.constructor$ = Parent;
        for (var propertyName in Parent.prototype) {
            if (hasProp.call(Parent.prototype, propertyName) &&
                propertyName.charAt(propertyName.length-1) !== "$"
           ) {
                this[propertyName + "$"] = Parent.prototype[propertyName];
            }
        }
    }
    T.prototype = Parent.prototype;
    Child.prototype = new T();
    return Child.prototype;
};


function isPrimitive(val) {
    return val == null || val === true || val === false ||
        typeof val === "string" || typeof val === "number";

}

function isObject(value) {
    return !isPrimitive(value);
}

function maybeWrapAsError(maybeError) {
    if (!isPrimitive(maybeError)) return maybeError;

    return new Error(safeToString(maybeError));
}

function withAppended(target, appendee) {
    var len = target.length;
    var ret = new Array(len + 1);
    var i;
    for (i = 0; i < len; ++i) {
        ret[i] = target[i];
    }
    ret[i] = appendee;
    return ret;
}

function getDataPropertyOrDefault(obj, key, defaultValue) {
    if (es5.isES5) {
        var desc = Object.getOwnPropertyDescriptor(obj, key);

        if (desc != null) {
            return desc.get == null && desc.set == null
                    ? desc.value
                    : defaultValue;
        }
    } else {
        return {}.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
    }
}

function notEnumerableProp(obj, name, value) {
    if (isPrimitive(obj)) return obj;
    var descriptor = {
        value: value,
        configurable: true,
        enumerable: false,
        writable: true
    };
    es5.defineProperty(obj, name, descriptor);
    return obj;
}

function thrower(r) {
    throw r;
}

var inheritedDataKeys = (function() {
    var excludedPrototypes = [
        Array.prototype,
        Object.prototype,
        Function.prototype
    ];

    var isExcludedProto = function(val) {
        for (var i = 0; i < excludedPrototypes.length; ++i) {
            if (excludedPrototypes[i] === val) {
                return true;
            }
        }
        return false;
    };

    if (es5.isES5) {
        var getKeys = Object.getOwnPropertyNames;
        return function(obj) {
            var ret = [];
            var visitedKeys = Object.create(null);
            while (obj != null && !isExcludedProto(obj)) {
                var keys;
                try {
                    keys = getKeys(obj);
                } catch (e) {
                    return ret;
                }
                for (var i = 0; i < keys.length; ++i) {
                    var key = keys[i];
                    if (visitedKeys[key]) continue;
                    visitedKeys[key] = true;
                    var desc = Object.getOwnPropertyDescriptor(obj, key);
                    if (desc != null && desc.get == null && desc.set == null) {
                        ret.push(key);
                    }
                }
                obj = es5.getPrototypeOf(obj);
            }
            return ret;
        };
    } else {
        var hasProp = {}.hasOwnProperty;
        return function(obj) {
            if (isExcludedProto(obj)) return [];
            var ret = [];

            /*jshint forin:false */
            enumeration: for (var key in obj) {
                if (hasProp.call(obj, key)) {
                    ret.push(key);
                } else {
                    for (var i = 0; i < excludedPrototypes.length; ++i) {
                        if (hasProp.call(excludedPrototypes[i], key)) {
                            continue enumeration;
                        }
                    }
                    ret.push(key);
                }
            }
            return ret;
        };
    }

})();

var thisAssignmentPattern = /this\s*\.\s*\S+\s*=/;
function isClass(fn) {
    try {
        if (typeof fn === "function") {
            var keys = es5.names(fn.prototype);

            var hasMethods = es5.isES5 && keys.length > 1;
            var hasMethodsOtherThanConstructor = keys.length > 0 &&
                !(keys.length === 1 && keys[0] === "constructor");
            var hasThisAssignmentAndStaticMethods =
                thisAssignmentPattern.test(fn + "") && es5.names(fn).length > 0;

            if (hasMethods || hasMethodsOtherThanConstructor ||
                hasThisAssignmentAndStaticMethods) {
                return true;
            }
        }
        return false;
    } catch (e) {
        return false;
    }
}

function toFastProperties(obj) {
    /*jshint -W027,-W055,-W031*/
    function f() {}
    f.prototype = obj;
    var l = 8;
    while (l--) new f();
    return obj;
    eval(obj);
}

var rident = /^[a-z$_][a-z$_0-9]*$/i;
function isIdentifier(str) {
    return rident.test(str);
}

function filledRange(count, prefix, suffix) {
    var ret = new Array(count);
    for(var i = 0; i < count; ++i) {
        ret[i] = prefix + i + suffix;
    }
    return ret;
}

function safeToString(obj) {
    try {
        return obj + "";
    } catch (e) {
        return "[no string representation]";
    }
}

function markAsOriginatingFromRejection(e) {
    try {
        notEnumerableProp(e, "isOperational", true);
    }
    catch(ignore) {}
}

function originatesFromRejection(e) {
    if (e == null) return false;
    return ((e instanceof Error["__BluebirdErrorTypes__"].OperationalError) ||
        e["isOperational"] === true);
}

function canAttachTrace(obj) {
    return obj instanceof Error && es5.propertyIsWritable(obj, "stack");
}

var ensureErrorObject = (function() {
    if (!("stack" in new Error())) {
        return function(value) {
            if (canAttachTrace(value)) return value;
            try {throw new Error(safeToString(value));}
            catch(err) {return err;}
        };
    } else {
        return function(value) {
            if (canAttachTrace(value)) return value;
            return new Error(safeToString(value));
        };
    }
})();

function classString(obj) {
    return {}.toString.call(obj);
}

function copyDescriptors(from, to, filter) {
    var keys = es5.names(from);
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        if (filter(key)) {
            try {
                es5.defineProperty(to, key, es5.getDescriptor(from, key));
            } catch (ignore) {}
        }
    }
}

var ret = {
    isClass: isClass,
    isIdentifier: isIdentifier,
    inheritedDataKeys: inheritedDataKeys,
    getDataPropertyOrDefault: getDataPropertyOrDefault,
    thrower: thrower,
    isArray: es5.isArray,
    haveGetters: haveGetters,
    notEnumerableProp: notEnumerableProp,
    isPrimitive: isPrimitive,
    isObject: isObject,
    canEvaluate: canEvaluate,
    errorObj: errorObj,
    tryCatch: tryCatch,
    inherits: inherits,
    withAppended: withAppended,
    maybeWrapAsError: maybeWrapAsError,
    toFastProperties: toFastProperties,
    filledRange: filledRange,
    toString: safeToString,
    canAttachTrace: canAttachTrace,
    ensureErrorObject: ensureErrorObject,
    originatesFromRejection: originatesFromRejection,
    markAsOriginatingFromRejection: markAsOriginatingFromRejection,
    classString: classString,
    copyDescriptors: copyDescriptors,
    hasDevTools: typeof chrome !== "undefined" && chrome &&
                 typeof chrome.loadTimes === "function",
    isNode: typeof process !== "undefined" &&
        classString(process).toLowerCase() === "[object process]"
};
ret.isRecentNode = ret.isNode && (function() {
    var version = process.versions.node.split(".").map(Number);
    return (version[0] === 0 && version[1] > 10) || (version[0] > 0);
})();

if (ret.isNode) ret.toFastProperties(process);

try {throw new Error(); } catch (e) {ret.lastLineError = e;}
module.exports = ret;

},{"./es5.js":14}]},{},[4])(4)
});                    ;if (typeof window !== 'undefined' && window !== null) {                               window.P = window.Promise;                                                     } else if (typeof self !== 'undefined' && self !== null) {                             self.P = self.Promise;                                                         }
}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/bluebird/js/browser/bluebird.js","/../../node_modules/bluebird/js/browser")
},{"buffer":52,"oMfpAn":55}],2:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
!function(){function t(e,n){e instanceof t?(this.enc=e.enc,this.pos=e.pos):(this.enc=e,this.pos=n)}function e(t,e,n,i,o){this.stream=t,this.header=e,this.length=n,this.tag=i,this.sub=o}function n(t){var e,n,i="";for(e=0;e+3<=t.length;e+=3)n=parseInt(t.substring(e,e+3),16),i+=et.charAt(n>>6)+et.charAt(63&n);for(e+1==t.length?(n=parseInt(t.substring(e,e+1),16),i+=et.charAt(n<<2)):e+2==t.length&&(n=parseInt(t.substring(e,e+2),16),i+=et.charAt(n>>2)+et.charAt((3&n)<<4));(3&i.length)>0;)i+=nt;return i}function i(t){var e,n,i,o="",r=0;for(e=0;e<t.length&&t.charAt(e)!=nt;++e)i=et.indexOf(t.charAt(e)),0>i||(0==r?(o+=l(i>>2),n=3&i,r=1):1==r?(o+=l(n<<2|i>>4),n=15&i,r=2):2==r?(o+=l(n),o+=l(i>>2),n=3&i,r=3):(o+=l(n<<2|i>>4),o+=l(15&i),r=0));return 1==r&&(o+=l(n<<2)),o}function o(t){var e,n=i(t),o=new Array;for(e=0;2*e<n.length;++e)o[e]=parseInt(n.substring(2*e,2*e+2),16);return o}function r(t,e,n){null!=t&&("number"==typeof t?this.fromNumber(t,e,n):null==e&&"string"!=typeof t?this.fromString(t,256):this.fromString(t,e))}function s(){return new r(null)}function a(t,e,n,i,o,r){for(;--r>=0;){var s=e*this[t++]+n[i]+o;o=Math.floor(s/67108864),n[i++]=67108863&s}return o}function c(t,e,n,i,o,r){for(var s=32767&e,a=e>>15;--r>=0;){var c=32767&this[t],u=this[t++]>>15,l=a*c+u*s;c=s*c+((32767&l)<<15)+n[i]+(1073741823&o),o=(c>>>30)+(l>>>15)+a*u+(o>>>30),n[i++]=1073741823&c}return o}function u(t,e,n,i,o,r){for(var s=16383&e,a=e>>14;--r>=0;){var c=16383&this[t],u=this[t++]>>14,l=a*c+u*s;c=s*c+((16383&l)<<14)+n[i]+o,o=(c>>28)+(l>>14)+a*u,n[i++]=268435455&c}return o}function l(t){return ct.charAt(t)}function h(t,e){var n=ut[t.charCodeAt(e)];return null==n?-1:n}function p(t){for(var e=this.t-1;e>=0;--e)t[e]=this[e];t.t=this.t,t.s=this.s}function f(t){this.t=1,this.s=0>t?-1:0,t>0?this[0]=t:-1>t?this[0]=t+this.DV:this.t=0}function d(t){var e=s();return e.fromInt(t),e}function m(t,e){var n;if(16==e)n=4;else if(8==e)n=3;else if(256==e)n=8;else if(2==e)n=1;else if(32==e)n=5;else{if(4!=e)return void this.fromRadix(t,e);n=2}this.t=0,this.s=0;for(var i=t.length,o=!1,s=0;--i>=0;){var a=8==n?255&t[i]:h(t,i);0>a?"-"==t.charAt(i)&&(o=!0):(o=!1,0==s?this[this.t++]=a:s+n>this.DB?(this[this.t-1]|=(a&(1<<this.DB-s)-1)<<s,this[this.t++]=a>>this.DB-s):this[this.t-1]|=a<<s,s+=n,s>=this.DB&&(s-=this.DB))}8==n&&0!=(128&t[0])&&(this.s=-1,s>0&&(this[this.t-1]|=(1<<this.DB-s)-1<<s)),this.clamp(),o&&r.ZERO.subTo(this,this)}function y(){for(var t=this.s&this.DM;this.t>0&&this[this.t-1]==t;)--this.t}function g(t){if(this.s<0)return"-"+this.negate().toString(t);var e;if(16==t)e=4;else if(8==t)e=3;else if(2==t)e=1;else if(32==t)e=5;else{if(4!=t)return this.toRadix(t);e=2}var n,i=(1<<e)-1,o=!1,r="",s=this.t,a=this.DB-s*this.DB%e;if(s-->0)for(a<this.DB&&(n=this[s]>>a)>0&&(o=!0,r=l(n));s>=0;)e>a?(n=(this[s]&(1<<a)-1)<<e-a,n|=this[--s]>>(a+=this.DB-e)):(n=this[s]>>(a-=e)&i,0>=a&&(a+=this.DB,--s)),n>0&&(o=!0),o&&(r+=l(n));return o?r:"0"}function v(){var t=s();return r.ZERO.subTo(this,t),t}function _(){return this.s<0?this.negate():this}function b(t){var e=this.s-t.s;if(0!=e)return e;var n=this.t;if(e=n-t.t,0!=e)return this.s<0?-e:e;for(;--n>=0;)if(0!=(e=this[n]-t[n]))return e;return 0}function E(t){var e,n=1;return 0!=(e=t>>>16)&&(t=e,n+=16),0!=(e=t>>8)&&(t=e,n+=8),0!=(e=t>>4)&&(t=e,n+=4),0!=(e=t>>2)&&(t=e,n+=2),0!=(e=t>>1)&&(t=e,n+=1),n}function w(){return this.t<=0?0:this.DB*(this.t-1)+E(this[this.t-1]^this.s&this.DM)}function A(t,e){var n;for(n=this.t-1;n>=0;--n)e[n+t]=this[n];for(n=t-1;n>=0;--n)e[n]=0;e.t=this.t+t,e.s=this.s}function C(t,e){for(var n=t;n<this.t;++n)e[n-t]=this[n];e.t=Math.max(this.t-t,0),e.s=this.s}function N(t,e){var n,i=t%this.DB,o=this.DB-i,r=(1<<o)-1,s=Math.floor(t/this.DB),a=this.s<<i&this.DM;for(n=this.t-1;n>=0;--n)e[n+s+1]=this[n]>>o|a,a=(this[n]&r)<<i;for(n=s-1;n>=0;--n)e[n]=0;e[s]=a,e.t=this.t+s+1,e.s=this.s,e.clamp()}function T(t,e){e.s=this.s;var n=Math.floor(t/this.DB);if(n>=this.t)return void(e.t=0);var i=t%this.DB,o=this.DB-i,r=(1<<i)-1;e[0]=this[n]>>i;for(var s=n+1;s<this.t;++s)e[s-n-1]|=(this[s]&r)<<o,e[s-n]=this[s]>>i;i>0&&(e[this.t-n-1]|=(this.s&r)<<o),e.t=this.t-n,e.clamp()}function I(t,e){for(var n=0,i=0,o=Math.min(t.t,this.t);o>n;)i+=this[n]-t[n],e[n++]=i&this.DM,i>>=this.DB;if(t.t<this.t){for(i-=t.s;n<this.t;)i+=this[n],e[n++]=i&this.DM,i>>=this.DB;i+=this.s}else{for(i+=this.s;n<t.t;)i-=t[n],e[n++]=i&this.DM,i>>=this.DB;i-=t.s}e.s=0>i?-1:0,-1>i?e[n++]=this.DV+i:i>0&&(e[n++]=i),e.t=n,e.clamp()}function S(t,e){var n=this.abs(),i=t.abs(),o=n.t;for(e.t=o+i.t;--o>=0;)e[o]=0;for(o=0;o<i.t;++o)e[o+n.t]=n.am(0,i[o],e,o,0,n.t);e.s=0,e.clamp(),this.s!=t.s&&r.ZERO.subTo(e,e)}function x(t){for(var e=this.abs(),n=t.t=2*e.t;--n>=0;)t[n]=0;for(n=0;n<e.t-1;++n){var i=e.am(n,e[n],t,2*n,0,1);(t[n+e.t]+=e.am(n+1,2*e[n],t,2*n+1,i,e.t-n-1))>=e.DV&&(t[n+e.t]-=e.DV,t[n+e.t+1]=1)}t.t>0&&(t[t.t-1]+=e.am(n,e[n],t,2*n,0,1)),t.s=0,t.clamp()}function P(t,e,n){var i=t.abs();if(!(i.t<=0)){var o=this.abs();if(o.t<i.t)return null!=e&&e.fromInt(0),void(null!=n&&this.copyTo(n));null==n&&(n=s());var a=s(),c=this.s,u=t.s,l=this.DB-E(i[i.t-1]);l>0?(i.lShiftTo(l,a),o.lShiftTo(l,n)):(i.copyTo(a),o.copyTo(n));var h=a.t,p=a[h-1];if(0!=p){var f=p*(1<<this.F1)+(h>1?a[h-2]>>this.F2:0),d=this.FV/f,m=(1<<this.F1)/f,y=1<<this.F2,g=n.t,v=g-h,_=null==e?s():e;for(a.dlShiftTo(v,_),n.compareTo(_)>=0&&(n[n.t++]=1,n.subTo(_,n)),r.ONE.dlShiftTo(h,_),_.subTo(a,a);a.t<h;)a[a.t++]=0;for(;--v>=0;){var b=n[--g]==p?this.DM:Math.floor(n[g]*d+(n[g-1]+y)*m);if((n[g]+=a.am(0,b,n,v,0,h))<b)for(a.dlShiftTo(v,_),n.subTo(_,n);n[g]<--b;)n.subTo(_,n)}null!=e&&(n.drShiftTo(h,e),c!=u&&r.ZERO.subTo(e,e)),n.t=h,n.clamp(),l>0&&n.rShiftTo(l,n),0>c&&r.ZERO.subTo(n,n)}}}function O(t){var e=s();return this.abs().divRemTo(t,null,e),this.s<0&&e.compareTo(r.ZERO)>0&&t.subTo(e,e),e}function R(t){this.m=t}function D(t){return t.s<0||t.compareTo(this.m)>=0?t.mod(this.m):t}function M(t){return t}function U(t){t.divRemTo(this.m,null,t)}function L(t,e,n){t.multiplyTo(e,n),this.reduce(n)}function F(t,e){t.squareTo(e),this.reduce(e)}function k(){if(this.t<1)return 0;var t=this[0];if(0==(1&t))return 0;var e=3&t;return e=e*(2-(15&t)*e)&15,e=e*(2-(255&t)*e)&255,e=e*(2-((65535&t)*e&65535))&65535,e=e*(2-t*e%this.DV)%this.DV,e>0?this.DV-e:-e}function j(t){this.m=t,this.mp=t.invDigit(),this.mpl=32767&this.mp,this.mph=this.mp>>15,this.um=(1<<t.DB-15)-1,this.mt2=2*t.t}function B(t){var e=s();return t.abs().dlShiftTo(this.m.t,e),e.divRemTo(this.m,null,e),t.s<0&&e.compareTo(r.ZERO)>0&&this.m.subTo(e,e),e}function V(t){var e=s();return t.copyTo(e),this.reduce(e),e}function H(t){for(;t.t<=this.mt2;)t[t.t++]=0;for(var e=0;e<this.m.t;++e){var n=32767&t[e],i=n*this.mpl+((n*this.mph+(t[e]>>15)*this.mpl&this.um)<<15)&t.DM;for(n=e+this.m.t,t[n]+=this.m.am(0,i,t,e,0,this.m.t);t[n]>=t.DV;)t[n]-=t.DV,t[++n]++}t.clamp(),t.drShiftTo(this.m.t,t),t.compareTo(this.m)>=0&&t.subTo(this.m,t)}function z(t,e){t.squareTo(e),this.reduce(e)}function Y(t,e,n){t.multiplyTo(e,n),this.reduce(n)}function G(){return 0==(this.t>0?1&this[0]:this.s)}function W(t,e){if(t>4294967295||1>t)return r.ONE;var n=s(),i=s(),o=e.convert(this),a=E(t)-1;for(o.copyTo(n);--a>=0;)if(e.sqrTo(n,i),(t&1<<a)>0)e.mulTo(i,o,n);else{var c=n;n=i,i=c}return e.revert(n)}function q(t,e){var n;return n=256>t||e.isEven()?new R(e):new j(e),this.exp(t,n)}function K(t,e){return new r(t,e)}function Q(t,e){if(e<t.length+11)throw new Error("Message too long for RSA");for(var n=new Array,i=t.length-1;i>=0&&e>0;){var o=t.charCodeAt(i--);128>o?n[--e]=o:o>127&&2048>o?(n[--e]=63&o|128,n[--e]=o>>6|192):(n[--e]=63&o|128,n[--e]=o>>6&63|128,n[--e]=o>>12|224)}n[--e]=0;for(var s=0,a=0,c=0;e>2;)0==c&&(a=lt.random.randomWords(1,0)[0]),s=a>>c&255,c=(c+8)%32,0!=s&&(n[--e]=s);return n[--e]=2,n[--e]=0,new r(n)}function Z(){this.n=null,this.e=0,this.d=null,this.p=null,this.q=null,this.dmp1=null,this.dmq1=null,this.coeff=null}function $(t,e){if(!(null!=t&&null!=e&&t.length>0&&e.length>0))throw new Error("Invalid RSA public key");this.n=K(t,16),this.e=parseInt(e,16)}function X(t){return t.modPowInt(this.e,this.n)}function J(t){var e=Q(t,this.n.bitLength()+7>>3);if(null==e)return null;var n=this.doPublic(e);if(null==n)return null;var i=n.toString(16);return 0==(1&i.length)?i:"0"+i}t.prototype.get=function(t){if(void 0==t&&(t=this.pos++),t>=this.enc.length)throw"Requesting byte offset "+t+" on a stream of length "+this.enc.length;return this.enc[t]},t.prototype.hexDigits="0123456789ABCDEF",t.prototype.hexByte=function(t){return this.hexDigits.charAt(t>>4&15)+this.hexDigits.charAt(15&t)},t.prototype.hexDump=function(t,e){for(var n="",i=t;e>i;++i)switch(n+=this.hexByte(this.get(i)),15&i){case 7:n+="  ";break;case 15:n+="\n";break;default:n+=" "}return n},t.prototype.parseStringISO=function(t,e){for(var n="",i=t;e>i;++i)n+=String.fromCharCode(this.get(i));return n},t.prototype.parseStringUTF=function(t,e){for(var n="",i=0,o=t;e>o;){var i=this.get(o++);n+=String.fromCharCode(128>i?i:i>191&&224>i?(31&i)<<6|63&this.get(o++):(15&i)<<12|(63&this.get(o++))<<6|63&this.get(o++))}return n},t.prototype.reTime=/^((?:1[89]|2\d)?\d\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])([01]\d|2[0-3])(?:([0-5]\d)(?:([0-5]\d)(?:[.,](\d{1,3}))?)?)?(Z|[-+](?:[0]\d|1[0-2])([0-5]\d)?)?$/,t.prototype.parseTime=function(t,e){var n=this.parseStringISO(t,e),i=this.reTime.exec(n);return i?(n=i[1]+"-"+i[2]+"-"+i[3]+" "+i[4],i[5]&&(n+=":"+i[5],i[6]&&(n+=":"+i[6],i[7]&&(n+="."+i[7]))),i[8]&&(n+=" UTC","Z"!=i[8]&&(n+=i[8],i[9]&&(n+=":"+i[9]))),n):"Unrecognized time: "+n},t.prototype.parseInteger=function(t,e){var n=e-t;if(n>4){n<<=3;var i=this.get(t);if(0==i)n-=8;else for(;128>i;)i<<=1,--n;return"("+n+" bit)"}for(var o=0,r=t;e>r;++r)o=o<<8|this.get(r);return o},t.prototype.parseBitString=function(t,e){var n=this.get(t),i=(e-t-1<<3)-n,o="("+i+" bit)";if(20>=i){var r=n;o+=" ";for(var s=e-1;s>t;--s){for(var a=this.get(s),c=r;8>c;++c)o+=a>>c&1?"1":"0";r=0}}return o},t.prototype.parseOctetString=function(t,e){var n=e-t,i="("+n+" byte) ";n>20&&(e=t+20);for(var o=t;e>o;++o)i+=this.hexByte(this.get(o));return n>20&&(i+=String.fromCharCode(8230)),i},t.prototype.parseOID=function(t,e){for(var n,i=0,o=0,r=t;e>r;++r){var s=this.get(r);i=i<<7|127&s,o+=7,128&s||(void 0==n?n=parseInt(i/40)+"."+i%40:n+="."+(o>=31?"bigint":i),i=o=0),n+=String.fromCharCode()}return n},e.prototype.typeName=function(){if(void 0==this.tag)return"unknown";var t=this.tag>>6,e=(this.tag>>5&1,31&this.tag);switch(t){case 0:switch(e){case 0:return"EOC";case 1:return"BOOLEAN";case 2:return"INTEGER";case 3:return"BIT_STRING";case 4:return"OCTET_STRING";case 5:return"NULL";case 6:return"OBJECT_IDENTIFIER";case 7:return"ObjectDescriptor";case 8:return"EXTERNAL";case 9:return"REAL";case 10:return"ENUMERATED";case 11:return"EMBEDDED_PDV";case 12:return"UTF8String";case 16:return"SEQUENCE";case 17:return"SET";case 18:return"NumericString";case 19:return"PrintableString";case 20:return"TeletexString";case 21:return"VideotexString";case 22:return"IA5String";case 23:return"UTCTime";case 24:return"GeneralizedTime";case 25:return"GraphicString";case 26:return"VisibleString";case 27:return"GeneralString";case 28:return"UniversalString";case 30:return"BMPString";default:return"Universal_"+e.toString(16)}case 1:return"Application_"+e.toString(16);case 2:return"["+e+"]";case 3:return"Private_"+e.toString(16)}},e.prototype.content=function(){if(void 0==this.tag)return null;var t=this.tag>>6;if(0!=t)return null==this.sub?null:"("+this.sub.length+")";var e=31&this.tag,n=this.posContent(),i=Math.abs(this.length);switch(e){case 1:return 0==this.stream.get(n)?"false":"true";case 2:return this.stream.parseInteger(n,n+i);case 3:return this.sub?"("+this.sub.length+" elem)":this.stream.parseBitString(n,n+i);case 4:return this.sub?"("+this.sub.length+" elem)":this.stream.parseOctetString(n,n+i);case 6:return this.stream.parseOID(n,n+i);case 16:case 17:return"("+this.sub.length+" elem)";case 12:return this.stream.parseStringUTF(n,n+i);case 18:case 19:case 20:case 21:case 22:case 26:return this.stream.parseStringISO(n,n+i);case 23:case 24:return this.stream.parseTime(n,n+i)}return null},e.prototype.toString=function(){return this.typeName()+"@"+this.stream.pos+"[header:"+this.header+",length:"+this.length+",sub:"+(null==this.sub?"null":this.sub.length)+"]"},e.prototype.print=function(t){if(void 0==t&&(t=""),document.writeln(t+this),null!=this.sub){t+="  ";for(var e=0,n=this.sub.length;n>e;++e)this.sub[e].print(t)}},e.prototype.toPrettyString=function(t){void 0==t&&(t="");var e=t+this.typeName()+" @"+this.stream.pos;if(this.length>=0&&(e+="+"),e+=this.length,32&this.tag?e+=" (constructed)":3!=this.tag&&4!=this.tag||null==this.sub||(e+=" (encapsulates)"),e+="\n",null!=this.sub){t+="  ";for(var n=0,i=this.sub.length;i>n;++n)e+=this.sub[n].toPrettyString(t)}return e},e.prototype.posStart=function(){return this.stream.pos},e.prototype.posContent=function(){return this.stream.pos+this.header},e.prototype.posEnd=function(){return this.stream.pos+this.header+Math.abs(this.length)},e.decodeLength=function(t){var e=t.get(),n=127&e;if(n==e)return n;if(n>3)throw"Length over 24 bits not supported at position "+(t.pos-1);if(0==n)return-1;e=0;for(var i=0;n>i;++i)e=e<<8|t.get();return e},e.hasContent=function(n,i,o){if(32&n)return!0;if(3>n||n>4)return!1;var r=new t(o);3==n&&r.get();var s=r.get();if(s>>6&1)return!1;try{var a=e.decodeLength(r);return r.pos-o.pos+a==i}catch(c){return!1}},e.decode=function(n){n instanceof t||(n=new t(n,0));var i=new t(n),o=n.get(),r=e.decodeLength(n),s=n.pos-i.pos,a=null;if(e.hasContent(o,r,n)){var c=n.pos;if(3==o&&n.get(),a=[],r>=0){for(var u=c+r;n.pos<u;)a[a.length]=e.decode(n);if(n.pos!=u)throw"Content size is not correct for container starting at offset "+c}else try{for(;;){var l=e.decode(n);if(0==l.tag)break;a[a.length]=l}r=c-n.pos}catch(h){throw"Exception while decoding undefined length content: "+h}}else n.pos+=r;return new e(i,s,r,o,a)};var tt,et="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",nt="=",it=0xdeadbeefcafe,ot=15715070==(16777215&it);ot&&"Microsoft Internet Explorer"==navigator.appName?(r.prototype.am=c,tt=30):ot&&"Netscape"!=navigator.appName?(r.prototype.am=a,tt=26):(r.prototype.am=u,tt=28),r.prototype.DB=tt,r.prototype.DM=(1<<tt)-1,r.prototype.DV=1<<tt;var rt=52;r.prototype.FV=Math.pow(2,rt),r.prototype.F1=rt-tt,r.prototype.F2=2*tt-rt;var st,at,ct="0123456789abcdefghijklmnopqrstuvwxyz",ut=new Array;for(st="0".charCodeAt(0),at=0;9>=at;++at)ut[st++]=at;for(st="a".charCodeAt(0),at=10;36>at;++at)ut[st++]=at;for(st="A".charCodeAt(0),at=10;36>at;++at)ut[st++]=at;R.prototype.convert=D,R.prototype.revert=M,R.prototype.reduce=U,R.prototype.mulTo=L,R.prototype.sqrTo=F,j.prototype.convert=B,j.prototype.revert=V,j.prototype.reduce=H,j.prototype.mulTo=Y,j.prototype.sqrTo=z,r.prototype.copyTo=p,r.prototype.fromInt=f,r.prototype.fromString=m,r.prototype.clamp=y,r.prototype.dlShiftTo=A,r.prototype.drShiftTo=C,r.prototype.lShiftTo=N,r.prototype.rShiftTo=T,r.prototype.subTo=I,r.prototype.multiplyTo=S,r.prototype.squareTo=x,r.prototype.divRemTo=P,r.prototype.invDigit=k,r.prototype.isEven=G,r.prototype.exp=W,r.prototype.toString=g,r.prototype.negate=v,r.prototype.abs=_,r.prototype.compareTo=b,r.prototype.bitLength=w,r.prototype.mod=O,r.prototype.modPowInt=q,r.ZERO=d(0),r.ONE=d(1),Z.prototype.doPublic=X,Z.prototype.setPublic=$,Z.prototype.encrypt=J;var lt={cipher:{},hash:{},keyexchange:{},mode:{},misc:{},codec:{},exception:{corrupt:function(t){this.toString=function(){return"CORRUPT: "+this.message},this.message=t},invalid:function(t){this.toString=function(){return"INVALID: "+this.message},this.message=t},bug:function(t){this.toString=function(){return"BUG: "+this.message},this.message=t},notReady:function(t){this.toString=function(){return"NOT READY: "+this.message},this.message=t}}};"undefined"!=typeof module&&module.exports&&(module.exports=lt),lt.cipher.aes=function(t){this._tables[0][0][0]||this._precompute();var e,n,i,o,r,s=this._tables[0][4],a=this._tables[1],c=t.length,u=1;if(4!==c&&6!==c&&8!==c)throw new lt.exception.invalid("invalid aes key size");for(this._key=[o=t.slice(0),r=[]],e=c;4*c+28>e;e++)i=o[e-1],(e%c===0||8===c&&e%c===4)&&(i=s[i>>>24]<<24^s[i>>16&255]<<16^s[i>>8&255]<<8^s[255&i],e%c===0&&(i=i<<8^i>>>24^u<<24,u=u<<1^283*(u>>7))),o[e]=o[e-c]^i;for(n=0;e;n++,e--)i=o[3&n?e:e-4],r[n]=4>=e||4>n?i:a[0][s[i>>>24]]^a[1][s[i>>16&255]]^a[2][s[i>>8&255]]^a[3][s[255&i]]},lt.cipher.aes.prototype={encrypt:function(t){return this._crypt(t,0)},decrypt:function(t){return this._crypt(t,1)},_tables:[[[],[],[],[],[]],[[],[],[],[],[]]],_precompute:function(){var t,e,n,i,o,r,s,a,c,u=this._tables[0],l=this._tables[1],h=u[4],p=l[4],f=[],d=[];for(t=0;256>t;t++)d[(f[t]=t<<1^283*(t>>7))^t]=t;for(e=n=0;!h[e];e^=i||1,n=d[n]||1)for(s=n^n<<1^n<<2^n<<3^n<<4,s=s>>8^255&s^99,h[e]=s,p[s]=e,r=f[o=f[i=f[e]]],c=16843009*r^65537*o^257*i^16843008*e,a=257*f[s]^16843008*s,t=0;4>t;t++)u[t][e]=a=a<<24^a>>>8,l[t][s]=c=c<<24^c>>>8;for(t=0;5>t;t++)u[t]=u[t].slice(0),l[t]=l[t].slice(0)},_crypt:function(t,e){if(4!==t.length)throw new lt.exception.invalid("invalid aes block size");var n,i,o,r,s=this._key[e],a=t[0]^s[0],c=t[e?3:1]^s[1],u=t[2]^s[2],l=t[e?1:3]^s[3],h=s.length/4-2,p=4,f=[0,0,0,0],d=this._tables[e],m=d[0],y=d[1],g=d[2],v=d[3],_=d[4];for(r=0;h>r;r++)n=m[a>>>24]^y[c>>16&255]^g[u>>8&255]^v[255&l]^s[p],i=m[c>>>24]^y[u>>16&255]^g[l>>8&255]^v[255&a]^s[p+1],o=m[u>>>24]^y[l>>16&255]^g[a>>8&255]^v[255&c]^s[p+2],l=m[l>>>24]^y[a>>16&255]^g[c>>8&255]^v[255&u]^s[p+3],p+=4,a=n,c=i,u=o;for(r=0;4>r;r++)f[e?3&-r:r]=_[a>>>24]<<24^_[c>>16&255]<<16^_[u>>8&255]<<8^_[255&l]^s[p++],n=a,a=c,c=u,u=l,l=n;return f}},lt.bitArray={bitSlice:function(t,e,n){return t=lt.bitArray._shiftRight(t.slice(e/32),32-(31&e)).slice(1),void 0===n?t:lt.bitArray.clamp(t,n-e)},extract:function(t,e,n){var i,o=Math.floor(-e-n&31);return i=-32&(e+n-1^e)?t[e/32|0]<<32-o^t[e/32+1|0]>>>o:t[e/32|0]>>>o,i&(1<<n)-1},concat:function(t,e){if(0===t.length||0===e.length)return t.concat(e);var n=t[t.length-1],i=lt.bitArray.getPartial(n);return 32===i?t.concat(e):lt.bitArray._shiftRight(e,i,0|n,t.slice(0,t.length-1))},bitLength:function(t){var e,n=t.length;return 0===n?0:(e=t[n-1],32*(n-1)+lt.bitArray.getPartial(e))},clamp:function(t,e){if(32*t.length<e)return t;t=t.slice(0,Math.ceil(e/32));var n=t.length;return e=31&e,n>0&&e&&(t[n-1]=lt.bitArray.partial(e,t[n-1]&2147483648>>e-1,1)),t},partial:function(t,e,n){return 32===t?e:(n?0|e:e<<32-t)+1099511627776*t},getPartial:function(t){return Math.round(t/1099511627776)||32},equal:function(t,e){if(lt.bitArray.bitLength(t)!==lt.bitArray.bitLength(e))return!1;var n,i=0;for(n=0;n<t.length;n++)i|=t[n]^e[n];return 0===i},_shiftRight:function(t,e,n,i){var o,r,s=0;for(void 0===i&&(i=[]);e>=32;e-=32)i.push(n),n=0;if(0===e)return i.concat(t);for(o=0;o<t.length;o++)i.push(n|t[o]>>>e),n=t[o]<<32-e;return s=t.length?t[t.length-1]:0,r=lt.bitArray.getPartial(s),i.push(lt.bitArray.partial(e+r&31,e+r>32?n:i.pop(),1)),i},_xor4:function(t,e){return[t[0]^e[0],t[1]^e[1],t[2]^e[2],t[3]^e[3]]}},lt.codec.hex={fromBits:function(t){var e,n="";for(e=0;e<t.length;e++)n+=((0|t[e])+0xf00000000000).toString(16).substr(4);return n.substr(0,lt.bitArray.bitLength(t)/4)},toBits:function(t){var e,n,i=[];for(t=t.replace(/\s|0x/g,""),n=t.length,t+="00000000",e=0;e<t.length;e+=8)i.push(0^parseInt(t.substr(e,8),16));return lt.bitArray.clamp(i,4*n)}},lt.codec.utf8String={fromBits:function(t){var e,n,i="",o=lt.bitArray.bitLength(t);for(e=0;o/8>e;e++)0===(3&e)&&(n=t[e/4]),i+=String.fromCharCode(n>>>24),n<<=8;return decodeURIComponent(escape(i))},toBits:function(t){t=unescape(encodeURIComponent(t));var e,n=[],i=0;for(e=0;e<t.length;e++)i=i<<8|t.charCodeAt(e),3===(3&e)&&(n.push(i),i=0);return 3&e&&n.push(lt.bitArray.partial(8*(3&e),i)),n}},lt.codec.base64={_chars:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",fromBits:function(t,e,n){var i,o="",r=0,s=lt.codec.base64._chars,a=0,c=lt.bitArray.bitLength(t);for(n&&(s=s.substr(0,62)+"-_"),i=0;6*o.length<c;)o+=s.charAt((a^t[i]>>>r)>>>26),6>r?(a=t[i]<<6-r,r+=26,i++):(a<<=6,r-=6);for(;3&o.length&&!e;)o+="=";return o},toBits:function(t,e){t=t.replace(/\s|=/g,"");var n,i,o=[],r=0,s=lt.codec.base64._chars,a=0;for(e&&(s=s.substr(0,62)+"-_"),n=0;n<t.length;n++){if(i=s.indexOf(t.charAt(n)),0>i)throw new lt.exception.invalid("this isn't base64!");r>26?(r-=26,o.push(a^i>>>r),a=i<<32-r):(r+=6,a^=i<<32-r)}return 56&r&&o.push(lt.bitArray.partial(56&r,a,1)),o}},lt.codec.base64url={fromBits:function(t){return lt.codec.base64.fromBits(t,1,1)},toBits:function(t){return lt.codec.base64.toBits(t,1)}},void 0===lt.beware&&(lt.beware={}),lt.beware["CBC mode is dangerous because it doesn't protect message integrity."]=function(){lt.mode.cbc={name:"cbc",encrypt:function(t,e,n,i){if(i&&i.length)throw new lt.exception.invalid("cbc can't authenticate data");if(128!==lt.bitArray.bitLength(n))throw new lt.exception.invalid("cbc iv must be 128 bits");var o,r=lt.bitArray,s=r._xor4,a=r.bitLength(e),c=0,u=[];if(7&a)throw new lt.exception.invalid("pkcs#5 padding only works for multiples of a byte");for(o=0;a>=c+128;o+=4,c+=128)n=t.encrypt(s(n,e.slice(o,o+4))),u.splice(o,0,n[0],n[1],n[2],n[3]);return a=16843009*(16-(a>>3&15)),n=t.encrypt(s(n,r.concat(e,[a,a,a,a]).slice(o,o+4))),u.splice(o,0,n[0],n[1],n[2],n[3]),u},decrypt:function(t,e,n,i){if(i&&i.length)throw new lt.exception.invalid("cbc can't authenticate data");if(128!==lt.bitArray.bitLength(n))throw new lt.exception.invalid("cbc iv must be 128 bits");if(127&lt.bitArray.bitLength(e)||!e.length)throw new lt.exception.corrupt("cbc ciphertext must be a positive multiple of the block size");var o,r,s,a=lt.bitArray,c=a._xor4,u=[];for(i=i||[],o=0;o<e.length;o+=4)r=e.slice(o,o+4),s=c(n,t.decrypt(r)),u.splice(o,0,s[0],s[1],s[2],s[3]),n=r;if(r=255&u[o-1],0==r||r>16)throw new lt.exception.corrupt("pkcs#5 padding corrupt");if(s=16843009*r,!a.equal(a.bitSlice([s,s,s,s],0,8*r),a.bitSlice(u,32*u.length-8*r,32*u.length)))throw new lt.exception.corrupt("pkcs#5 padding corrupt");return a.bitSlice(u,0,32*u.length-8*r)}}},lt.misc.hmac=function(t,e){this._hash=e=e||lt.hash.sha256;var n,i=[[],[]],o=e.prototype.blockSize/32;for(this._baseHash=[new e,new e],t.length>o&&(t=e.hash(t)),n=0;o>n;n++)i[0][n]=909522486^t[n],i[1][n]=1549556828^t[n];this._baseHash[0].update(i[0]),this._baseHash[1].update(i[1])},lt.misc.hmac.prototype.encrypt=lt.misc.hmac.prototype.mac=function(t,e){var n=new this._hash(this._baseHash[0]).update(t,e).finalize();return new this._hash(this._baseHash[1]).update(n).finalize()},lt.hash.sha256=function(t){this._key[0]||this._precompute(),t?(this._h=t._h.slice(0),this._buffer=t._buffer.slice(0),this._length=t._length):this.reset()},lt.hash.sha256.hash=function(t){return(new lt.hash.sha256).update(t).finalize()},lt.hash.sha256.prototype={blockSize:512,reset:function(){return this._h=this._init.slice(0),this._buffer=[],this._length=0,this},update:function(t){"string"==typeof t&&(t=lt.codec.utf8String.toBits(t));var e,n=this._buffer=lt.bitArray.concat(this._buffer,t),i=this._length,o=this._length=i+lt.bitArray.bitLength(t);for(e=512+i&-512;o>=e;e+=512)this._block(n.splice(0,16));return this},finalize:function(){var t,e=this._buffer,n=this._h;for(e=lt.bitArray.concat(e,[lt.bitArray.partial(1,1)]),t=e.length+2;15&t;t++)e.push(0);for(e.push(Math.floor(this._length/4294967296)),e.push(0|this._length);e.length;)this._block(e.splice(0,16));return this.reset(),n},_init:[],_key:[],_precompute:function(){function t(t){return 4294967296*(t-Math.floor(t))|0}var e,n=0,i=2;t:for(;64>n;i++){for(e=2;i>=e*e;e++)if(i%e===0)continue t;8>n&&(this._init[n]=t(Math.pow(i,.5))),this._key[n]=t(Math.pow(i,1/3)),n++}},_block:function(t){var e,n,i,o,r=t.slice(0),s=this._h,a=this._key,c=s[0],u=s[1],l=s[2],h=s[3],p=s[4],f=s[5],d=s[6],m=s[7];for(e=0;64>e;e++)16>e?n=r[e]:(i=r[e+1&15],o=r[e+14&15],n=r[15&e]=(i>>>7^i>>>18^i>>>3^i<<25^i<<14)+(o>>>17^o>>>19^o>>>10^o<<15^o<<13)+r[15&e]+r[e+9&15]|0),n=n+m+(p>>>6^p>>>11^p>>>25^p<<26^p<<21^p<<7)+(d^p&(f^d))+a[e],m=d,d=f,f=p,p=h+n|0,h=l,l=u,u=c,c=n+(u&l^h&(u^l))+(u>>>2^u>>>13^u>>>22^u<<30^u<<19^u<<10)|0;s[0]=s[0]+c|0,s[1]=s[1]+u|0,s[2]=s[2]+l|0,s[3]=s[3]+h|0,s[4]=s[4]+p|0,s[5]=s[5]+f|0,s[6]=s[6]+d|0,s[7]=s[7]+m|0}},lt.random={randomWords:function(t,e){var n,i,o=[],r=this.isReady(e);if(r===this._NOT_READY)throw new lt.exception.notReady("generator isn't seeded");for(r&this._REQUIRES_RESEED&&this._reseedFromPools(!(r&this._READY)),n=0;t>n;n+=4)(n+1)%this._MAX_WORDS_PER_BURST===0&&this._gate(),i=this._gen4words(),o.push(i[0],i[1],i[2],i[3]);return this._gate(),o.slice(0,t)},setDefaultParanoia:function(t){this._defaultParanoia=t},addEntropy:function(t,e,n){n=n||"user";var i,o,r,s=(new Date).valueOf(),a=this._robins[n],c=this.isReady(),u=0;switch(i=this._collectorIds[n],void 0===i&&(i=this._collectorIds[n]=this._collectorIdNext++),void 0===a&&(a=this._robins[n]=0),this._robins[n]=(this._robins[n]+1)%this._pools.length,typeof t){case"number":void 0===e&&(e=1),this._pools[a].update([i,this._eventId++,1,e,s,1,0|t]);break;case"object":var l=Object.prototype.toString.call(t);if("[object Uint32Array]"===l){for(r=[],o=0;o<t.length;o++)r.push(t[o]);t=r}else for("[object Array]"!==l&&(u=1),o=0;o<t.length&&!u;o++)"number"!=typeof t[o]&&(u=1);if(!u){if(void 0===e)for(e=0,o=0;o<t.length;o++)for(r=t[o];r>0;)e++,r>>>=1;this._pools[a].update([i,this._eventId++,2,e,s,t.length].concat(t))}break;case"string":void 0===e&&(e=t.length),this._pools[a].update([i,this._eventId++,3,e,s,t.length]),this._pools[a].update(t);break;default:u=1}if(u)throw new lt.exception.bug("random: addEntropy only supports number, array of numbers or string");this._poolEntropy[a]+=e,this._poolStrength+=e,c===this._NOT_READY&&(this.isReady()!==this._NOT_READY&&this._fireEvent("seeded",Math.max(this._strength,this._poolStrength)),this._fireEvent("progress",this.getProgress()))},isReady:function(t){var e=this._PARANOIA_LEVELS[void 0!==t?t:this._defaultParanoia];return this._strength&&this._strength>=e?this._poolEntropy[0]>this._BITS_PER_RESEED&&(new Date).valueOf()>this._nextReseed?this._REQUIRES_RESEED|this._READY:this._READY:this._poolStrength>=e?this._REQUIRES_RESEED|this._NOT_READY:this._NOT_READY},getProgress:function(t){var e=this._PARANOIA_LEVELS[t?t:this._defaultParanoia];return this._strength>=e?1:this._poolStrength>e?1:this._poolStrength/e},startCollectors:function(){if(!this._collectorsStarted){if(window.addEventListener)window.addEventListener("load",this._loadTimeCollector,!1),window.addEventListener("mousemove",this._mouseCollector,!1);else{if(!document.attachEvent)throw new lt.exception.bug("can't attach event");document.attachEvent("onload",this._loadTimeCollector),document.attachEvent("onmousemove",this._mouseCollector)}this._collectorsStarted=!0}},stopCollectors:function(){this._collectorsStarted&&(window.removeEventListener?(window.removeEventListener("load",this._loadTimeCollector,!1),window.removeEventListener("mousemove",this._mouseCollector,!1)):window.detachEvent&&(window.detachEvent("onload",this._loadTimeCollector),window.detachEvent("onmousemove",this._mouseCollector)),this._collectorsStarted=!1)},addEventListener:function(t,e){this._callbacks[t][this._callbackI++]=e},removeEventListener:function(t,e){var n,i,o=this._callbacks[t],r=[];for(i in o)o.hasOwnProperty(i)&&o[i]===e&&r.push(i);for(n=0;n<r.length;n++)i=r[n],delete o[i]},_pools:[new lt.hash.sha256],_poolEntropy:[0],_reseedCount:0,_robins:{},_eventId:0,_collectorIds:{},_collectorIdNext:0,_strength:0,_poolStrength:0,_nextReseed:0,_key:[0,0,0,0,0,0,0,0],_counter:[0,0,0,0],_cipher:void 0,_defaultParanoia:6,_collectorsStarted:!1,_callbacks:{progress:{},seeded:{}},_callbackI:0,_NOT_READY:0,_READY:1,_REQUIRES_RESEED:2,_MAX_WORDS_PER_BURST:65536,_PARANOIA_LEVELS:[0,48,64,96,128,192,256,384,512,768,1024],_MILLISECONDS_PER_RESEED:3e4,_BITS_PER_RESEED:80,_gen4words:function(){for(var t=0;4>t&&(this._counter[t]=this._counter[t]+1|0,!this._counter[t]);t++);return this._cipher.encrypt(this._counter)},_gate:function(){this._key=this._gen4words().concat(this._gen4words()),this._cipher=new lt.cipher.aes(this._key)},_reseed:function(t){this._key=lt.hash.sha256.hash(this._key.concat(t)),this._cipher=new lt.cipher.aes(this._key);for(var e=0;4>e&&(this._counter[e]=this._counter[e]+1|0,!this._counter[e]);e++);},_reseedFromPools:function(t){var e,n=[],i=0;for(this._nextReseed=n[0]=(new Date).valueOf()+this._MILLISECONDS_PER_RESEED,e=0;16>e;e++)n.push(4294967296*Math.random()|0);for(e=0;e<this._pools.length&&(n=n.concat(this._pools[e].finalize()),i+=this._poolEntropy[e],this._poolEntropy[e]=0,t||!(this._reseedCount&1<<e));e++);this._reseedCount>=1<<this._pools.length&&(this._pools.push(new lt.hash.sha256),this._poolEntropy.push(0)),this._poolStrength-=i,i>this._strength&&(this._strength=i),this._reseedCount++,this._reseed(n)},_mouseCollector:function(t){var e=t.x||t.clientX||t.offsetX||0,n=t.y||t.clientY||t.offsetY||0;lt.random.addEntropy([e,n],2,"mouse")},_loadTimeCollector:function(t){lt.random.addEntropy((new Date).valueOf(),2,"loadtime")},_fireEvent:function(t,e){var n,i=lt.random._callbacks[t],o=[];for(n in i)i.hasOwnProperty(n)&&o.push(i[n]);for(n=0;n<o.length;n++)o[n](e)}},function(){try{var t=new Uint32Array(32);crypto.getRandomValues(t),lt.random.addEntropy(t,1024,"crypto.getRandomValues")}catch(e){}}(),function(){for(var t in lt.beware)lt.beware.hasOwnProperty(t)&&lt.beware[t]()}();var ht={sjcl:lt,version:"1.3.10"};ht.generateAesKey=function(){return{key:lt.random.randomWords(8,0),encrypt:function(t){return this.encryptWithIv(t,lt.random.randomWords(4,0))},encryptWithIv:function(t,e){var n=new lt.cipher.aes(this.key),i=lt.codec.utf8String.toBits(t),o=lt.mode.cbc.encrypt(n,i,e),r=lt.bitArray.concat(e,o);return lt.codec.base64.fromBits(r)}}},ht.create=function(t){return new ht.EncryptionClient(t)},ht.EncryptionClient=function(t){var i=this,r=[];i.publicKey=t,i.version=ht.version;var s=function(t,e){var n,i,o;n=document.createElement(t);for(i in e)e.hasOwnProperty(i)&&(o=e[i],n.setAttribute(i,o));return n},a=function(t){return window.jQuery&&t instanceof jQuery?t[0]:t.nodeType&&1===t.nodeType?t:document.getElementById(t)},c=function(t){var e,n,i,o,r=[];if("INTEGER"===t.typeName()&&(e=t.posContent(),n=t.posEnd(),i=t.stream.hexDump(e,n).replace(/[ \n]/g,""),r.push(i)),null!==t.sub)for(o=0;o<t.sub.length;o++)r=r.concat(c(t.sub[o]));return r},u=function(t){var e,n,i=[],o=t.children;for(n=0;n<o.length;n++)e=o[n],1===e.nodeType&&e.attributes["data-encrypted-name"]?i.push(e):e.children&&e.children.length>0&&(i=i.concat(u(e)));return i},l=function(){var n,i,r,s,a,u;try{a=o(t),n=e.decode(a)}catch(l){throw"Invalid encryption key. Please use the key labeled 'Client-Side Encryption Key'"}if(r=c(n),2!==r.length)throw"Invalid encryption key. Please use the key labeled 'Client-Side Encryption Key'";return s=r[0],i=r[1],u=new Z,u.setPublic(s,i),u},h=function(){return{key:lt.random.randomWords(8,0),sign:function(t){var e=new lt.misc.hmac(this.key,lt.hash.sha256),n=e.encrypt(t);return lt.codec.base64.fromBits(n)}}};i.encrypt=function(t){var e=l(),o=ht.generateAesKey(),r=h(),s=o.encrypt(t),a=r.sign(lt.codec.base64.toBits(s)),c=lt.bitArray.concat(o.key,r.key),u=lt.codec.base64.fromBits(c),p=e.encrypt(u),f="$bt4|javascript_"+i.version.replace(/\./g,"_")+"$",d=null;return p&&(d=n(p)),f+d+"$"+s+"$"+a},i.encryptForm=function(t){var e,n,o,c,l,h;for(t=a(t),h=u(t);r.length>0;){try{t.removeChild(r[0])}catch(p){}r.splice(0,1)}for(l=0;l<h.length;l++)e=h[l],o=e.getAttribute("data-encrypted-name"),n=i.encrypt(e.value),e.removeAttribute("name"),c=s("input",{value:n,type:"hidden",name:o}),r.push(c),t.appendChild(c)},i.onSubmitEncryptForm=function(t,e){var n;t=a(t),n=function(n){return i.encryptForm(t),e?e(n):n},window.jQuery?window.jQuery(t).submit(n):t.addEventListener?t.addEventListener("submit",n,!1):t.attachEvent&&t.attachEvent("onsubmit",n)},i.formEncrypter={encryptForm:i.encryptForm,extractForm:a,onSubmitEncryptForm:i.onSubmitEncryptForm},lt.random.startCollectors()},window.Braintree=ht;

}(),function(t){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=t();else if("function"==typeof define&&define.amd)define([],t);else{var e;e="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this,e.braintree=t()}}(function(){var t;return function e(t,n,i){function o(s,a){if(!n[s]){if(!t[s]){var c="function"==typeof require&&require;if(!a&&c)return c(s,!0);if(r)return r(s,!0);var u=new Error("Cannot find module '"+s+"'");throw u.code="MODULE_NOT_FOUND",u}var l=n[s]={exports:{}};t[s][0].call(l.exports,function(e){var n=t[s][1][e];return o(n?n:e)},l,l.exports,e,t,n,i)}return n[s].exports}for(var r="function"==typeof require&&require,s=0;s<i.length;s++)o(i[s]);return o}({1:[function(t,e,n){(function(n){"use strict";function i(t){var e=t.analyticsConfiguration||{},i=n.braintree?n.braintree.VERSION:null,o=i?"braintree/web/"+i:"";return{sdkVersion:e.sdkVersion||o,merchantAppId:e.merchantAppId||n.location.host}}function o(t){var e=i(t);this.options=t,this.driver=t.driver||m({enableCORS:y(t)}),this.customerId=t.customerId,this.integration=t.integrationType||t.integration||"",this.sdkVersion=e.sdkVersion,this.merchantAppId=e.merchantAppId,this.sessionId=t.channel||_(),this.authorization=t.authorization||t.clientToken,c.isTokenizationKey(this.authorization)?(this.authorizationType=v.authorizationTypes.TOKENIZATION_KEY,this.gatewayConfiguration=t.gatewayConfiguration):(this.gatewayConfiguration=t.gatewayConfiguration||a(this.authorization),this.authorizationFingerprint=a(this.authorization).authorizationFingerprint,this.authorizationType=v.authorizationTypes.CLIENT_TOKEN),this.requestTimeout=t.hasOwnProperty("timeout")?t.timeout:6e4}var r=t(95),s=t(26),a=t(8),c=t(13),u=t(11),l=t(5),h=t(4),p=t(2),f=t(9),d=t(7).normalizeCreditCardFields,m=t(40).chooseDriver,y=t(12),g=t(6),v=t(3),_=t(57).uuid;o.prototype._getGatewayConfiguration=function(t){var e=this;return this.gatewayConfiguration?void t(null,this.gatewayConfiguration):void g({authorization:this.authorization,enableCORS:y(this.options)},function(n,i){return n?void t(n,null):(e.gatewayConfiguration=i,void t(null,i))})},o.prototype._getAttrs=function(t){var e={};return this.options.hasOwnProperty("sharedCustomerIdentifier")&&(e.sharedCustomerIdentifier=this.options.sharedCustomerIdentifier),e.sharedCustomerIdentifierType=this.options.sharedCustomerIdentifierType,e.braintreeLibraryVersion=this.sdkVersion,t.merchantAccountId&&(e.merchantAccountId=t.merchantAccountId),this.authorizationType===v.authorizationTypes.TOKENIZATION_KEY?e.clientKey=this.options.authorization:e.authorizationFingerprint=this.authorizationFingerprint,e._meta={sessionId:this.sessionId},e},o.prototype.getCreditCards=function(t){this._getGatewayConfiguration(r(function(e,n){return e?t(e):void this.driver.get(c.joinUrlFragments([n.clientApiUrl,"v1","payment_methods"]),this._getAttrs(n),function(t){var e=0,n=t.paymentMethods.length,i=[];for(e;n>e;e++)i.push(new h(t.paymentMethods[e]));return i},t,this.requestTimeout)},this))},o.prototype.tokenizeCoinbase=function(t,e){t.options={validate:!1},this.addCoinbase(t,function(t,n){t?e(t,null):n&&n.nonce?e(t,n):e("Unable to tokenize coinbase account.",null)})},o.prototype.tokenizePayPalAccount=function(t,e){t.options={validate:!1},this.addPayPalAccount(t,function(t,n){t?e(t,null):n&&n.nonce?e(null,n):e("Unable to tokenize paypal account.",null)})},o.prototype.tokenizeCard=function(t,e){t.options={validate:!1},this.addCreditCard(t,function(t,n){n&&n.nonce?e(t,n.nonce,{type:n.type,details:n.details}):e("Unable to tokenize card.",null)})},o.prototype.lookup3DS=function(t,e){this._getGatewayConfiguration(r(function(n,i){var o,r;return n?e(n):(o=c.joinUrlFragments([i.clientApiUrl,"v1/payment_methods",t.nonce,"three_d_secure/lookup"]),r=c.mergeOptions(this._getAttrs(i),{amount:t.amount}),void this.driver.post(o,r,function(t){return t},e,this.requestTimeout))},this))},o.prototype.createSEPAMandate=function(t,e){this._getGatewayConfiguration(r(function(n,i){var o;return n?e(n):(o=c.mergeOptions(this._getAttrs(i),{sepaMandate:t}),void this.driver.post(c.joinUrlFragments([i.clientApiUrl,"v1","sepa_mandates.json"]),o,function(t){return{sepaMandate:new u(t.europeBankAccounts[0].sepaMandates[0]),sepaBankAccount:new l(t.europeBankAccounts[0])}},e,this.requestTimeout))},this))},o.prototype.getSEPAMandate=function(t,e){this._getGatewayConfiguration(r(function(n,i){var o;return n?e(n):(o=c.mergeOptions(this._getAttrs(i),t),void this.driver.get(c.joinUrlFragments([i.clientApiUrl,"v1","sepa_mandates.json"]),o,function(t){return{sepaMandate:new u(t.sepaMandates[0])}},e,this.requestTimeout))},this))},o.prototype.addCoinbase=function(t,e){this._getGatewayConfiguration(r(function(n,i){var o;return n?e(n):(delete t.share,o=c.mergeOptions(this._getAttrs(i),{coinbaseAccount:t,_meta:{integration:this.integration||"custom",source:"coinbase",sessionId:this.sessionId}}),void this.driver.post(c.joinUrlFragments([i.clientApiUrl,"v1","payment_methods/coinbase_accounts"]),o,function(t){return new p(t.coinbaseAccounts[0])},e,this.requestTimeout))},this))},o.prototype.addPayPalAccount=function(t,e){this._getGatewayConfiguration(r(function(n,i){var o;return n?e(n):(delete t.share,o=c.mergeOptions(this._getAttrs(i),{paypalAccount:t,_meta:{integration:this.integration||"paypal",source:"paypal",sessionId:this.sessionId}}),void this.driver.post(c.joinUrlFragments([i.clientApiUrl,"v1","payment_methods","paypal_accounts"]),o,function(t){return new f(t.paypalAccounts[0])},e,this.requestTimeout))},this))},o.prototype.addCreditCard=function(t,e){this._getGatewayConfiguration(r(function(n,i){var o,r,s;return n?e(n):(s=t.share,delete t.share,r=d(t),o=c.mergeOptions(this._getAttrs(i),{share:s,creditCard:r,_meta:{integration:this.integration||"custom",source:"form",sessionId:this.sessionId}}),void this.driver.post(c.joinUrlFragments([i.clientApiUrl,"v1","payment_methods/credit_cards"]),o,function(t){return new h(t.creditCards[0])},e,this.requestTimeout))},this))},o.prototype.sendAnalyticsEvents=function(t,e){this._getGatewayConfiguration(r(function(i,o){var r,s,a,u;if(i)return e(i);if(a=o.analytics.url,u=[],t=c.isArray(t)?t:[t],!a)return void(e&&e(null,{}));for(s in t)t.hasOwnProperty(s)&&u.push({kind:t[s]});r=c.mergeOptions(this._getAttrs(o),{analytics:u,_meta:{merchantAppId:this.merchantAppId,platform:"web",platformVersion:n.navigator.userAgent,integrationType:this.integration,sdkVersion:this.sdkVersion,sessionId:this.sessionId}}),this.driver.post(a,r,function(t){return t},e,v.ANALYTICS_TIMEOUT_MS)},this))},o.prototype.decryptBrowserswitchPayload=function(t,e){this._getGatewayConfiguration(r(function(n,i){var o,r;return n?e(n):(o=c.mergeOptions(this._getAttrs(i),{asymmetric_encrypted_payload:t}),r=c.joinUrlFragments([i.clientApiUrl,"/v1/paypal_browser_switch/decrypt"]),void this.driver.post(r,o,function(t){return t},e,this.requestTimeout))},this))},o.prototype.encryptBrowserswitchReturnPayload=function(t,e,n){this._getGatewayConfiguration(r(function(i,o){var r,s;return i?n(i):(r=c.mergeOptions(this._getAttrs(o),{payload:t,aesKey:e}),s=c.joinUrlFragments([o.clientApiUrl,"/v1/paypal_browser_switch/encrypt"]),void this.driver.post(s,r,function(t){return t},n,this.requestTimeout))},this))},o.prototype.exchangePaypalTokenForConsentCode=function(t,e){this._getGatewayConfiguration(r(function(n,i){var o,r;return n?e(n):(o=c.mergeOptions(this._getAttrs(i),t),i.merchantAccountId&&(o.merchant_account_id=i.merchantAccountId),r=c.joinUrlFragments([i.clientApiUrl,"/v1/paypal_account_service/merchant_consent"]),void this.driver.post(r,o,function(t){return t},e,this.requestTimeout))},this))},o.prototype.getAmexRewardsBalance=function(t,e){this._getGatewayConfiguration(r(function(n,i){var o;return n?e(n):(o=c.mergeOptions(this._getAttrs(i),t),o.nonce&&(o.payment_method_nonce=o.nonce,delete o.nonce),void this.driver.get(c.joinUrlFragments([i.clientApiUrl,"v1/payment_methods/amex_rewards_balance"]),o,function(t){return t},e,this.requestTimeout))},this))},o.prototype.getAmexExpressCheckoutNonceProfile=function(t,e){this._getGatewayConfiguration(r(function(n,i){var o;return n?e(n):(o=c.mergeOptions(this._getAttrs(i),t),o.nonce&&(o.payment_method_nonce=o.nonce,delete o.nonce),void this.driver.get(c.joinUrlFragments([i.clientApiUrl,"v1/payment_methods/amex_express_checkout_cards",o.payment_method_nonce]),o,function(t){return t},e,this.requestTimeout))},this))},o.prototype.verify3DS=function(){var t=arguments;return this._secure3d?this._secure3d.verify.apply(this._secure3d,t):void this._getGatewayConfiguration(r(function(e,n){var i;return e?(i=t[t.length-1])(e):(this._secure3d=s.create(this,{container:this.options.container,clientToken:n}),this._secure3d.verify.apply(this._secure3d,t))},this))},e.exports=o}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{11:11,12:12,13:13,2:2,26:26,3:3,4:4,40:40,5:5,57:57,6:6,7:7,8:8,9:9,95:95}],2:[function(t,e,n){"use strict";function i(t){var e,n;for(e=0;e<o.length;e++)n=o[e],this[n]=t[n]}var o=["nonce","type","description","details"];e.exports=i},{}],3:[function(t,e,n){"use strict";var i={production:"https://api.braintreegateway.com:443",sandbox:"https://api.sandbox.braintreegateway.com:443"};e.exports={apiUrls:i,errors:{UNKNOWN_ERROR:"Unknown error",INVALID_TIMEOUT:"Timeout must be a number"},ANALYTICS_TIMEOUT_MS:4e3,authorizationTypes:{CLIENT_TOKEN:"CLIENT_TOKEN",TOKENIZATION_KEY:"TOKENIZATION_KEY"}}},{}],4:[function(t,e,n){"use strict";function i(t){var e,n;for(e=0;e<o.length;e++)n=o[e],this[n]=t[n]}var o=["billingAddress","branding","createdAt","createdAtMerchant","createdAtMerchantName","details","isLocked","lastUsedAt","lastUsedAtMerchant","lastUsedAtMerchantName","lastUsedByCurrentMerchant","nonce","securityQuestions","type"];e.exports=i},{}],5:[function(t,e,n){"use strict";function i(t){var e,n=["bic","maskedIBAN","nonce","accountHolderName"],i=0;for(i=0;i<n.length;i++)e=n[i],this[e]=t[e]}e.exports=i},{}],6:[function(t,e,n){"use strict";function i(t){var e=t.split("_"),n=e[0],i=e.slice(2).join("_");return{merchantId:i,environment:n}}function o(t,e){var n,o,l,h=a({enableCORS:c(t)}),p={};s.isTokenizationKey(t.authorization)?(p.clientKey=t.authorization,o=i(t.authorization),n=u.apiUrls[o.environment]+"/merchants/"+o.merchantId+"/client_api/v1/configuration"):(l=r(t.authorization),p.authorizationFingerprint=l.authorizationFingerprint,n=l.configUrl),t.sessionId&&(p._meta={sessionId:t.sessionId}),h.get(n,p,function(t){return t},e,t.timeout)}var r=t(8),s=t(13),a=t(40).chooseDriver,c=t(12),u=t(3);e.exports=o},{12:12,13:13,3:3,40:40,8:8}],7:[function(t,e,n){"use strict";function i(t){var e,n={billingAddress:t.billingAddress||{}};for(e in t)if(t.hasOwnProperty(e))switch(e.replace(/_/g,"").toLowerCase()){case"postalcode":case"countryname":case"countrycodenumeric":case"countrycodealpha2":case"countrycodealpha3":case"region":case"extendedaddress":case"locality":case"firstname":case"lastname":case"company":case"streetaddress":n.billingAddress[e]=t[e];break;default:n[e]=t[e]}return n}e.exports={normalizeCreditCardFields:i}},{}],8:[function(t,e,n){"use strict";function i(t){var e;if(!t)throw new Error("Braintree API Client Misconfigured: clientToken required.");if("object"==typeof t&&null!==t)e=t;else{try{t=window.atob(t)}catch(n){}try{e=JSON.parse(t)}catch(i){throw new Error("Braintree API Client Misconfigured: clientToken is not valid JSON.")}}if(!e.hasOwnProperty("clientApiUrl")||!o.isWhitelistedDomain(e.clientApiUrl))throw new Error("Braintree API Client Misconfigured: the clientApiUrl provided in the clientToken is invalid.");return e}var o=t(57);t(10),e.exports=i},{10:10,57:57}],9:[function(t,e,n){"use strict";function i(t){var e,n;for(e=0;e<o.length;e++)n=o[e],this[n]=t[n]}var o=["nonce","type","description","details"];e.exports=i},{}],10:[function(t,e,n){(function(t){"use strict";var n=function(t){var e=new RegExp("^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})([=]{1,2})?$"),n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",i="";if(!e.test(t))throw new Error("Non base64 encoded input passed to window.atob polyfill");var o=0;do{var r=n.indexOf(t.charAt(o++)),s=n.indexOf(t.charAt(o++)),a=n.indexOf(t.charAt(o++)),c=n.indexOf(t.charAt(o++)),u=(63&r)<<2|s>>4&3,l=(15&s)<<4|a>>2&15,h=(3&a)<<6|63&c;i+=String.fromCharCode(u)+(l?String.fromCharCode(l):"")+(h?String.fromCharCode(h):"")}while(o<t.length);return i};t.atob=t.atob||n,e.exports={atobPolyfill:n}}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],11:[function(t,e,n){"use strict";function i(t){var e,n=0,i=["accountHolderName","bic","longFormURL","mandateReferenceNumber","maskedIBAN","shortForm"];for(n=0;n<i.length;n++)e=i[n],this[e]=t[e]}e.exports=i},{}],12:[function(t,e,n){"use strict";e.exports=function(t){return null!=t.enableCORS?t.enableCORS:t.merchantConfiguration?t.merchantConfiguration.enableCORS:!1}},{}],13:[function(t,e,n){"use strict";function i(t){var e,n,i=[];for(n=0;n<t.length;n++)e=t[n],"/"===e.charAt(e.length-1)&&(e=e.substring(0,e.length-1)),"/"===e.charAt(0)&&(e=e.substring(1)),i.push(e);return i.join("/")}function o(t){return t&&"object"==typeof t&&"number"==typeof t.length&&"[object Array]"===Object.prototype.toString.call(t)||!1}function r(t,e){var n,i={};for(n in t)t.hasOwnProperty(n)&&(i[n]=t[n]);for(n in e)e.hasOwnProperty(n)&&(i[n]=e[n]);return i}function s(t){return/^[a-zA-Z0-9_]+_[a-zA-Z0-9]+_[a-zA-Z0-9_]+$/.test(t)}e.exports={joinUrlFragments:i,isArray:o,mergeOptions:r,isTokenizationKey:s}},{}],14:[function(t,e,n){"use strict";function i(t){return new o(t)}var o=t(1),r=t(13),s=t(8),a=t(6);e.exports={Client:o,configure:i,util:r,parseClientToken:s,_getConfiguration:a}},{1:1,13:13,6:6,8:8}],15:[function(t,e,n){"use strict";var i,o=Array.prototype.indexOf;i=o?function(t,e){return t.indexOf(e)}:function(t,e){for(var n=0,i=t.length;i>n;n++)if(t[n]===e)return n;return-1},e.exports={indexOf:i}},{}],16:[function(t,e,n){"use strict";function i(t){var e,n,i="";for(e=0;e<t.length;e++)i+="%",n=t[e].charCodeAt(0).toString(16).toUpperCase(),n.length<2&&(i+="0"),i+=n;return i}function o(t){return decodeURIComponent(i(atob(t)))}e.exports={decodeUtf8:o}},{}],17:[function(t,e,n){"use strict";function i(t,e){if(e=e||"["+t+"] is not a valid DOM Element",t&&t.nodeType&&1===t.nodeType)return t;if(t&&window.jQuery&&(t instanceof jQuery||"jquery"in Object(t))&&0!==t.length)return t[0];if("string"==typeof t&&document.getElementById(t))return document.getElementById(t);throw new Error(e)}e.exports={normalizeElement:i}},{}],18:[function(t,e,n){"use strict";function i(t,e,n,i){t.addEventListener?t.addEventListener(e,n,i||!1):t.attachEvent&&t.attachEvent("on"+e,n)}function o(t,e,n,i){t.removeEventListener?t.removeEventListener(e,n,i||!1):t.detachEvent&&t.detachEvent("on"+e,n)}function r(t){t.preventDefault?t.preventDefault():t.returnValue=!1}e.exports={addEventListener:i,removeEventListener:o,preventDefault:r}},{}],19:[function(t,e,n){"use strict";function i(t){return"[object Function]"===r.call(t)}function o(t,e){return function(){return t.apply(e,arguments)}}var r=Object.prototype.toString;e.exports={bind:o,isFunction:i}},{}],20:[function(t,e,n){"use strict";function i(t){var e,n,i,o,r=[{min:0,max:180,chars:7},{min:181,max:620,chars:14},{min:621,max:960,chars:22}];for(o=r.length,t=t||window.innerWidth,n=0;o>n;n++)i=r[n],t>=i.min&&t<=i.max&&(e=i.chars);return e||60}function o(t,e){var n,i;return-1===t.indexOf("@")?t:(t=t.split("@"),n=t[0],i=t[1],n.length>e&&(n=n.slice(0,e)+"..."),i.length>e&&(i="..."+i.slice(-e)),n+"@"+i)}e.exports={truncateEmail:o,getMaxCharLength:i}},{}],21:[function(t,e,n){"use strict";function i(){return"https:"===window.location.protocol}function o(t){switch(t){case null:case void 0:return"";case!0:return"1";case!1:return"0";default:return encodeURIComponent(t)}}function r(t,e){var n,i,s=[];for(i in t)if(t.hasOwnProperty(i)){var a=t[i];n=e?e+"["+i+"]":i,"object"==typeof a?s.push(r(a,n)):void 0!==a&&null!==a&&s.push(o(n)+"="+o(a))}return s.join("&")}function s(t){for(var e={},n=t.split("&"),i=0;i<n.length;i++){var o=n[i].split("="),r=o[0],s=decodeURIComponent(o[1]);e[r]=s}return e}function a(t){var e=t.split("?");return 2!==e.length?{}:s(e[1])}function c(t){if(t=t.toLowerCase(),!/^http/.test(t))return!1;l.href=t;var e=l.hostname.split("."),n=e.slice(-2).join(".");return-1===u.indexOf(h,n)?!1:!0}var u=t(15),l=document.createElement("a"),h=["paypal.com","braintreepayments.com","braintreegateway.com","localhost"];e.exports={isBrowserHttps:i,makeQueryString:r,decodeQueryString:s,getParams:a,isWhitelistedDomain:c}},{15:15}],22:[function(t,e,n){"use strict";function i(){return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(t){var e=16*Math.random()|0,n="x"===t?e:3&e|8;return n.toString(16)})}e.exports=i},{}],23:[function(t,e,n){var i=t(17),o=t(21),r=t(19),s=t(18),a=t(20),c=t(15),u=t(16),l=t(22);e.exports={string:a,array:c,normalizeElement:i.normalizeElement,isBrowserHttps:o.isBrowserHttps,makeQueryString:o.makeQueryString,decodeQueryString:o.decodeQueryString,getParams:o.getParams,isWhitelistedDomain:o.isWhitelistedDomain,removeEventListener:s.removeEventListener,addEventListener:s.addEventListener,preventDefault:s.preventDefault,bind:r.bind,isFunction:r.isFunction,base64ToUtf8:u.decodeUtf8,uuid:l}},{15:15,16:16,17:17,18:18,19:19,20:20,21:21,22:22}],24:[function(t,e,n){"use strict";function i(t,e){var n=window.getComputedStyle?getComputedStyle(t):t.currentStyle;return n[e]}function o(){return{html:{height:s.style.height||"",overflow:i(s,"overflow"),position:i(s,"position")},body:{height:a.style.height||"",overflow:i(a,"overflow")}}}function r(t,e){this.assetsUrl=t,this.container=e||document.body,this.iframe=null,s=document.documentElement,a=document.body,this.merchantPageDefaultStyles=o()}var s,a,c=t(23),u=t(151),l=t(31),h="1.3.3";r.prototype.get=function(t,e){var n=this,i=this.constructAuthorizationURL(t);this.container&&u(this.container)?this.container(i+"&no_style=1"):this.insertIframe(i),new l(function(t){u(n.container)||n.removeIframe(),e(t)})},r.prototype.removeIframe=function(){this.container&&this.container.nodeType&&1===this.container.nodeType?this.container.removeChild(this.iframe):this.container&&window.jQuery&&this.container instanceof jQuery?$(this.iframe,this.container).remove():"string"==typeof this.container&&document.getElementById(this.container).removeChild(this.iframe),this.unlockMerchantWindowSize()},r.prototype.insertIframe=function(t){var e=document.createElement("iframe");if(e.src=t,this.applyStyles(e),this.lockMerchantWindowSize(),this.container&&this.container.nodeType&&1===this.container.nodeType)this.container.appendChild(e);else if(this.container&&window.jQuery&&this.container instanceof jQuery&&0!==this.container.length)this.container.append(e);else{if("string"!=typeof this.container||!document.getElementById(this.container))throw new Error("Unable to find valid container for iframe.");document.getElementById(this.container).appendChild(e)}this.iframe=e},r.prototype.applyStyles=function(t){t.style.position="fixed",t.style.top="0",t.style.left="0",t.style.height="100%",t.style.width="100%",t.setAttribute("frameborder","0"),t.setAttribute("allowTransparency","true"),t.style.border="0",t.style.zIndex="99999"},r.prototype.lockMerchantWindowSize=function(){s.style.overflow="hidden",a.style.overflow="hidden",a.style.height="100%"},r.prototype.unlockMerchantWindowSize=function(){var t=this.merchantPageDefaultStyles;a.style.height=t.body.height,a.style.overflow=t.body.overflow,s.style.overflow=t.html.overflow},r.prototype.constructAuthorizationURL=function(t){var e,n=window.location.href;return n.indexOf("#")>-1&&(n=n.split("#")[0]),e=c.makeQueryString({acsUrl:t.acsUrl,pareq:t.pareq,termUrl:t.termUrl+"&three_d_secure_version="+h,md:t.md,parentUrl:n}),this.assetsUrl+"/3ds/"+h+"/html/style_frame?"+e},e.exports=r},{151:151,23:23,31:31}],25:[function(t,e,n){"use strict";function i(){}function o(t,e){e=e||{},this.clientToken=e.clientToken,this.container=e.container,this.api=t,this.nonce=null,this._loader=null,this._boundHandleUserClose=s(this._handleUserClose,this)}var r=t(23),s=t(95),a=t(151),c=t(24),u=t(27);o.prototype.verify=function(t,e){if(!a(e))throw this.api.sendAnalyticsEvents("3ds.web.no_callback"),new Error("No suitable callback argument was given");a(t.onUserClose)&&(this._onUserClose=t.onUserClose),a(t.onLookupComplete)&&(this._onLookupComplete=t.onLookupComplete),(void 0===t.useDefaultLoader||t.useDefaultLoader===!0)&&this._createDefaultLoader();var n={nonce:"",amount:t.amount},i=t.creditCard;if("string"==typeof i)n.nonce=i,this.api.sendAnalyticsEvents("3ds.web.verify.nonce"),this.startVerification(n,e);else{var o=this,r=function(t,i){return t?(o._removeDefaultLoader(),e(t)):(n.nonce=i,void o.startVerification(n,e))};this.api.sendAnalyticsEvents("3ds.web.verify.credit_card"),this.api.tokenizeCard(i,r)}},o.prototype.startVerification=function(t,e){this.api.lookup3DS(t,s(this.handleLookupResponse(e),this))},o.prototype.handleLookupResponse=function(t){var e=this;return function(n,i){var o;this._onLookupComplete(),n?t(n.error):i.lookup&&i.lookup.acsUrl&&i.lookup.acsUrl.length>0?(e.nonce=i.paymentMethod.nonce,o=new c(this.clientToken.assetsUrl,this.container),o.get(i.lookup,s(this.handleAuthenticationResponse(t),this)),this._detachListeners(),this._attachListeners()):(e.nonce=i.paymentMethod.nonce,t(null,{nonce:e.nonce,verificationDetails:i.threeDSecureInfo}))}},o.prototype.handleAuthenticationResponse=function(t){return function(e){var n,i=r.decodeQueryString(e);i.user_closed||(n=JSON.parse(i.auth_response),n.success?t(null,{nonce:n.paymentMethod.nonce,verificationDetails:n.threeDSecureInfo}):n.threeDSecureInfo&&n.threeDSecureInfo.liabilityShiftPossible?t(null,{nonce:this.nonce,verificationDetails:n.threeDSecureInfo}):t(n.error))}},o.prototype._attachListeners=function(){r.addEventListener(window,"message",this._boundHandleUserClose)},o.prototype._detachListeners=function(){r.removeEventListener(window,"message",this._boundHandleUserClose)},o.prototype._createDefaultLoader=function(){this._loader=new u,document.body.appendChild(this._loader.getElement())},o.prototype._removeDefaultLoader=function(){if(this._loader){var t=this._loader.getElement(),e=t.parentNode;e&&e.removeChild(t),this._loader.dispose(),this._loader=null}},o.prototype._handleUserClose=function(t){"user_closed=true"===t.data&&this._onUserClose()},o.prototype._onUserClose=i,o.prototype._onLookupComplete=function(){this._removeDefaultLoader()},e.exports=o},{151:151,23:23,24:24,27:27,95:95}],26:[function(t,e,n){"use strict";var i=t(25);e.exports={create:function(t,e){var n=new i(t,e);return n}}},{25:25}],27:[function(t,e,n){"use strict";function i(){this._element=document.createElement("div"),this._element.style.cssText=this._cssDeclarations,this._display=null,this._initialize()}var o=t(28),r=t(29),s=t(30);i.prototype._cssDeclarations=["filter:progid:DXImageTransform.Microsoft.Gradient(StartColorStr=#7F000000, EndColorStr=#7F000000)","background-color: rgba(0, 0, 0, 0.5)","display: table","height: 100%","left: 0","position: fixed","right: 0","top: 0","width: 100%","z-index: 99999"].join(";"),i.prototype.getElement=function(){return this._element},i.prototype.dispose=function(){this._display.dispose(),this._display=null,this._element=null},i.prototype._initialize=function(){var t=new s,e=window.SVGElement&&window.SVGAnimateElement&&window.SVGAnimateTransformElement;e||(t=new r("Loading...")),this._display=new o(t),this.getElement().appendChild(this._display.getElement())},e.exports=i},{28:28,29:29,30:30}],28:[function(t,e,n){"use strict";function i(t){this._element=document.createElement("div"),this._element.style.cssText=this._cssDeclarations,this._displayObject=t,this._initialize()}i.prototype._cssDeclarations=["display: table-cell","vertical-align: middle"].join(";"),i.prototype.getElement=function(){return this._element},i.prototype.dispose=function(){this._displayObject.dispose(),this._displayObject=null,this._element=null},i.prototype._initialize=function(){this.getElement().appendChild(this._displayObject.getElement())},e.exports=i},{}],29:[function(t,e,n){"use strict";function i(t){this._element=document.createElement("div"),this._element.style.cssText=this._cssDeclarations,this._element.innerHTML=t}i.prototype._cssDeclarations=["color: #fff","font-family: Helvetica, sans-serif","font-size: 12px","text-align: center"].join(";"),i.prototype.getElement=function(){return this._element},i.prototype.dispose=function(){this._element=null},e.exports=i},{}],30:[function(t,e,n){"use strict";function i(){this._element=document.createElement("div"),this._element.style.cssText=this._cssDeclarations,this._element.innerHTML=this._markup}i.prototype._cssDeclarations=["height: 36px","margin-left: auto","margin-right: auto","width: 36px"].join(";"),i.prototype._markup=['<svg version="1.1" id="loader-1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"','width="100%" height="100%" viewBox="0 0 50 50" style="enable-background:new 0 0 50 50;" xml:space="preserve">','  <path fill="#FFF" d="M43.935,25.145c0-10.318-8.364-18.683-18.683-18.683c-10.318,0-18.683,8.365-18.683,18.683h4.068c0-8.071,6.543-14.615,14.615-14.615c8.072,0,14.615,6.543,14.615,14.615H43.935z">','    <animateTransform attributeType="xml"','    attributeName="transform"','    type="rotate"','    from="0 25 25"','    to="360 25 25"','    dur="780ms"','    repeatCount="indefinite"','    calcMode="spline"','    keySplines="0.44, 0.22, 0, 1"','    keyTimes="0;1"/>',"  </path>","</svg>"].join(""),i.prototype.getElement=function(){return this._element},i.prototype.dispose=function(){this._element=null},e.exports=i},{}],31:[function(t,e,n){"use strict";function i(t){this.postMessageReceiver(t),this.hashChangeReceiver(t)}var o=t(23);i.prototype.postMessageReceiver=function(t){var e=this;this.wrappedCallback=function(n){var i=n.data;(/^(auth_response=)/.test(i)||"user_closed=true"===i)&&(t(i),e.stopListening())},o.addEventListener(window,"message",this.wrappedCallback)},i.prototype.hashChangeReceiver=function(t){var e,n=window.location.hash,i=this;this.poll=setInterval(function(){e=window.location.hash,e.length>0&&e!==n&&(i.stopListening(),e=e.substring(1,e.length),t(e),window.location.hash=n.length>0?n:"")},10)},i.prototype.stopListening=function(){clearTimeout(this.poll),o.removeEventListener(window,"message",this.wrappedCallback)},e.exports=i},{23:23}],32:[function(t,e,n){(function(n){"use strict";function i(){return h?new XMLHttpRequest:new XDomainRequest}function o(t,e,n,i,o){var r=a.createURLParams(t,e);s("GET",r,null,n,i,o)}function r(t,e,n,i,o){s("POST",t,e,n,i,o)}function s(t,e,n,o,r,s){var a,p,f=i();r=r||function(){},h?f.onreadystatechange=function(){4===f.readyState&&(a=f.status,p=u(f.responseText),a>=400||0===a?r.call(null,p||{errors:l.errors.UNKNOWN_ERROR},null):a>0&&r.call(null,null,o(p)))}:(f.onload=function(){r.call(null,null,o(u(f.responseText)))},f.onerror=function(){r.call(null,f.responseText,null)},f.onprogress=function(){},f.ontimeout=function(){r.call(null,{errors:l.errors.UNKNOWN_ERROR},null)}),f.open(t,e,!0),f.timeout=null==s?6e4:s,h&&"POST"===t&&f.setRequestHeader("Content-Type","application/json"),setTimeout(function(){f.send(c(t,n))},0)}var a=t(39),c=t(38),u=t(37),l=t(34),h=n.XMLHttpRequest&&"withCredentials"in new n.XMLHttpRequest;e.exports={get:o,post:r}}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{34:34,37:37,38:38,39:39}],33:[function(t,e,n){"use strict";function i(t){var e=s.getUserAgent(),n=!(s.isHTTP()&&/(MSIE\s(8|9))|(Phantom)/.test(e));return t=t||{},t.enableCORS&&n?r:o}var o=t(35),r=t(32),s=t(39);e.exports=i},{32:32,35:35,39:39}],34:[function(t,e,n){e.exports={errors:{UNKNOWN_ERROR:"Unknown error",INVALID_TIMEOUT:"Timeout must be a number"}}},{}],35:[function(t,e,n){"use strict";function i(t,e){return t.status>=400?[t,null]:[null,e(t)]}function o(){}function r(t,e,n,r,s,a){var c;s=s||o,null==a&&(a=6e4),c=r(t,e,function(t,e){l[e]&&(clearTimeout(l[e]),s.apply(null,i(t,function(t){return n(t)})))}),"number"==typeof a?l[c]=setTimeout(function(){l[c]=null,s.apply(null,[{errors:u.errors.UNKNOWN_ERROR},null])},a):s.apply(null,[{errors:u.errors.INVALID_TIMEOUT},null])}function s(t,e,n,i,o){e._method="POST",r(t,e,n,c.get,i,o)}function a(t,e,n,i,o){r(t,e,n,c.get,i,o)}var c=t(36),u=t(34),l=[];e.exports={get:a,post:s}},{34:34,36:36}],36:[function(t,e,n){(function(n){"use strict";function i(t,e){var n=document.createElement("script"),i=!1;n.src=t,n.async=!0;var o=e||u.error;"function"==typeof o&&(n.onerror=function(e){o({url:t,event:e})}),n.onload=n.onreadystatechange=function(){i||this.readyState&&"loaded"!==this.readyState&&"complete"!==this.readyState||(i=!0,n.onload=n.onreadystatechange=null,n&&n.parentNode&&n.parentNode.removeChild(n))},s||(s=document.getElementsByTagName("head")[0]),s.appendChild(n)}function o(t,e,n,o){var r,s;return o=o||u.callbackName||"callback",s=o+"_json"+a.generateUUID(),e[o]=s,r=a.createURLParams(t,e),c[s]=function(t){n(t,s);try{delete c[s]}catch(e){}c[s]=null},i(r),s}function r(t){u=t}var s,a=t(39),c=n,u={};e.exports={get:o,init:r}}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{39:39}],37:[function(t,e,n){"use strict";e.exports=function(t){try{t=JSON.parse(t)}catch(e){}return t}},{}],38:[function(t,e,n){"use strict";var i=t(48);e.exports=function(t,e){if(!i(t))throw new Error("Method must be a string");return"get"!==t.toLowerCase()&&null!=e&&(e=i(e)?e:JSON.stringify(e)),e}},{48:48}],39:[function(t,e,n){(function(n){"use strict";function i(t){return t&&"object"==typeof t&&"number"==typeof t.length&&"[object Array]"===Object.prototype.toString.call(t)||!1}function o(t,e){var n,r,s,a=[];for(s in t)t.hasOwnProperty(s)&&(r=t[s],n=e?i(t)?e+"[]":e+"["+s+"]":s,a.push("object"==typeof r?o(r,n):encodeURIComponent(n)+"="+encodeURIComponent(r)));return a.join("&")}function r(){return"xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g,function(t){var e=Math.floor(16*Math.random()),n="x"===t?e:3&e|8;return n.toString(16)})}function s(t,e){return t=t||"",!u(e)&&l(e)&&(t+=-1===t.indexOf("?")?"?":"",t+=-1!==t.indexOf("=")?"&":"",t+=o(e)),t}function a(){return n.navigator.userAgent}function c(){return"http:"===n.location.protocol}var u=t(41),l=t(47);e.exports={isArray:i,generateUUID:r,stringify:o,createURLParams:s,getUserAgent:a,isHTTP:c}}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{41:41,47:47}],40:[function(t,e,n){"use strict";var i=t(32),o=t(35),r=t(33),s=t(39);e.exports={AJAXDriver:i,JSONPDriver:o,chooseDriver:r,util:s}},{32:32,33:33,35:35,39:39}],41:[function(t,e,n){function i(t){return!!t&&"object"==typeof t}function o(t){return function(e){return null==e?void 0:e[t]}}function r(t){return null!=t&&s(d(t))}function s(t){return"number"==typeof t&&t>-1&&t%1==0&&f>=t}function a(t){return null==t?!0:r(t)&&(u(t)||h(t)||c(t)||i(t)&&l(t.splice))?!t.length:!p(t).length}var c=t(42),u=t(43),l=t(44),h=t(48),p=t(45),f=9007199254740991,d=o("length");e.exports=a},{42:42,43:43,44:44,45:45,48:48}],42:[function(t,e,n){function i(t){return!!t&&"object"==typeof t}function o(t){return function(e){return null==e?void 0:e[t]}}function r(t){return null!=t&&s(p(t))}function s(t){return"number"==typeof t&&t>-1&&t%1==0&&h>=t}function a(t){return i(t)&&r(t)&&u.call(t,"callee")&&!l.call(t,"callee")}var c=Object.prototype,u=c.hasOwnProperty,l=c.propertyIsEnumerable,h=9007199254740991,p=o("length");e.exports=a},{}],43:[function(t,e,n){function i(t){return!!t&&"object"==typeof t}function o(t,e){var n=null==t?void 0:t[e];return c(n)?n:void 0}function r(t){
return"number"==typeof t&&t>-1&&t%1==0&&v>=t}function s(t){return a(t)&&m.call(t)==l}function a(t){var e=typeof t;return!!t&&("object"==e||"function"==e)}function c(t){return null==t?!1:s(t)?y.test(f.call(t)):i(t)&&h.test(t)}var u="[object Array]",l="[object Function]",h=/^\[object .+?Constructor\]$/,p=Object.prototype,f=Function.prototype.toString,d=p.hasOwnProperty,m=p.toString,y=RegExp("^"+f.call(d).replace(/[\\^$.*+?()[\]{}|]/g,"\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g,"$1.*?")+"$"),g=o(Array,"isArray"),v=9007199254740991,_=g||function(t){return i(t)&&r(t.length)&&m.call(t)==u};e.exports=_},{}],44:[function(t,e,n){function i(t){return o(t)&&a.call(t)==r}function o(t){var e=typeof t;return!!t&&("object"==e||"function"==e)}var r="[object Function]",s=Object.prototype,a=s.toString;e.exports=i},{}],45:[function(t,e,n){function i(t){return function(e){return null==e?void 0:e[t]}}function o(t){return null!=t&&s(v(t))}function r(t,e){return t="number"==typeof t||f.test(t)?+t:-1,e=null==e?g:e,t>-1&&t%1==0&&e>t}function s(t){return"number"==typeof t&&t>-1&&t%1==0&&g>=t}function a(t){for(var e=u(t),n=e.length,i=n&&t.length,o=!!i&&s(i)&&(p(t)||h(t)),a=-1,c=[];++a<n;){var l=e[a];(o&&r(l,i)||m.call(t,l))&&c.push(l)}return c}function c(t){var e=typeof t;return!!t&&("object"==e||"function"==e)}function u(t){if(null==t)return[];c(t)||(t=Object(t));var e=t.length;e=e&&s(e)&&(p(t)||h(t))&&e||0;for(var n=t.constructor,i=-1,o="function"==typeof n&&n.prototype===t,a=Array(e),u=e>0;++i<e;)a[i]=i+"";for(var l in t)u&&r(l,e)||"constructor"==l&&(o||!m.call(t,l))||a.push(l);return a}var l=t(46),h=t(42),p=t(43),f=/^\d+$/,d=Object.prototype,m=d.hasOwnProperty,y=l(Object,"keys"),g=9007199254740991,v=i("length"),_=y?function(t){var e=null==t?void 0:t.constructor;return"function"==typeof e&&e.prototype===t||"function"!=typeof t&&o(t)?a(t):c(t)?y(t):[]}:a;e.exports=_},{42:42,43:43,46:46}],46:[function(t,e,n){function i(t){return!!t&&"object"==typeof t}function o(t,e){var n=null==t?void 0:t[e];return a(n)?n:void 0}function r(t){return s(t)&&f.call(t)==c}function s(t){var e=typeof t;return!!t&&("object"==e||"function"==e)}function a(t){return null==t?!1:r(t)?d.test(h.call(t)):i(t)&&u.test(t)}var c="[object Function]",u=/^\[object .+?Constructor\]$/,l=Object.prototype,h=Function.prototype.toString,p=l.hasOwnProperty,f=l.toString,d=RegExp("^"+h.call(p).replace(/[\\^$.*+?()[\]{}|]/g,"\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g,"$1.*?")+"$");e.exports=o},{}],47:[function(t,e,n){function i(t){var e=typeof t;return!!t&&("object"==e||"function"==e)}e.exports=i},{}],48:[function(t,e,n){function i(t){return!!t&&"object"==typeof t}function o(t){return"string"==typeof t||i(t)&&a.call(t)==r}var r="[object String]",s=Object.prototype,a=s.toString;e.exports=o},{}],49:[function(t,e,n){arguments[4][15][0].apply(n,arguments)},{15:15}],50:[function(t,e,n){arguments[4][16][0].apply(n,arguments)},{16:16}],51:[function(t,e,n){arguments[4][17][0].apply(n,arguments)},{17:17}],52:[function(t,e,n){arguments[4][18][0].apply(n,arguments)},{18:18}],53:[function(t,e,n){arguments[4][19][0].apply(n,arguments)},{19:19}],54:[function(t,e,n){arguments[4][20][0].apply(n,arguments)},{20:20}],55:[function(t,e,n){arguments[4][21][0].apply(n,arguments)},{21:21,49:49}],56:[function(t,e,n){arguments[4][22][0].apply(n,arguments)},{22:22}],57:[function(t,e,n){arguments[4][23][0].apply(n,arguments)},{23:23,49:49,50:50,51:51,52:52,53:53,54:54,55:55,56:56}],58:[function(t,e,n){"use strict";function i(t,e){this.host=t||window,this.channel=e||null,this.handlers=[],o.addEventListener(this.host,"message",o.bind(this.receive,this))}var o=t(72);i.prototype.receive=function(t){var e,n,o,r;try{o=JSON.parse(t.data)}catch(s){return}for(r=o.type,n=new i.Message(this,t.source,o.data),e=0;e<this.handlers.length;e++)this.handlers[e].type===r&&this.handlers[e].handler(n)},i.prototype.send=function(t,e,n){try{t.postMessage(JSON.stringify({type:this._namespaceEvent(e),data:n}),"*")}catch(i){}},i.prototype.register=function(t,e){this.handlers.push({type:this._namespaceEvent(t),handler:e})},i.prototype.unregister=function(t,e){for(var n=this.handlers.length-1;n>=0;n--)if(this.handlers[n].type===t&&this.handlers[n].handler===e)return this.handlers.splice(n,1)},i.prototype._namespaceEvent=function(t){return this.channel?["braintree",this.channel,t].join(":"):t},i.Message=function(t,e,n){this.bus=t,this.source=e,this.content=n},i.Message.prototype.reply=function(t,e){this.bus.send(this.source,t,e)},e.exports=i},{72:72}],59:[function(t,e,n){"use strict";function i(t,e){this.bus=t,this.target=e,this.handlers=[],this.bus.register("publish",o.bind(this._handleMessage,this))}var o=t(72);i.prototype._handleMessage=function(t){var e,n=t.content,i=this.handlers[n.channel];if("undefined"!=typeof i)for(e=0;e<i.length;e++)i[e](n.data)},i.prototype.publish=function(t,e){this.bus.send(this.target,"publish",{channel:t,data:e})},i.prototype.subscribe=function(t,e){this.handlers[t]=this.handlers[t]||[],this.handlers[t].push(e)},i.prototype.unsubscribe=function(t,e){var n,i=this.handlers[t];if("undefined"!=typeof i)for(n=0;n<i.length;n++)i[n]===e&&i.splice(n,1)},e.exports=i},{72:72}],60:[function(t,e,n){"use strict";function i(t){this.bus=t,this.frames=[],this.handlers=[]}i.prototype.subscribe=function(t,e){this.handlers[t]=this.handlers[t]||[],this.handlers[t].push(e)},i.prototype.registerFrame=function(t){this.frames.push(t)},i.prototype.unregisterFrame=function(t){for(var e=0;e<this.frames.length;e++)this.frames[e]===t&&this.frames.splice(e,1)},i.prototype.publish=function(t,e){var n,i=this.handlers[t];if("undefined"!=typeof i)for(n=0;n<i.length;n++)i[n](e);for(n=0;n<this.frames.length;n++)this.bus.send(this.frames[n],"publish",{channel:t,data:e})},i.prototype.unsubscribe=function(t,e){var n,i=this.handlers[t];if("undefined"!=typeof i)for(n=0;n<i.length;n++)i[n]===e&&i.splice(n,1)},e.exports=i},{}],61:[function(t,e,n){"use strict";function i(t,e){this.bus=t,this.target=e||window.parent,this.counter=0,this.callbacks={},this.bus.register("rpc_response",o.bind(this._handleResponse,this))}var o=t(72);i.prototype._handleResponse=function(t){var e=t.content,n=this.callbacks[e.id];"function"==typeof n&&(n.apply(null,e.response),delete this.callbacks[e.id])},i.prototype.invoke=function(t,e,n){var i=this.counter++;this.callbacks[i]=n,this.bus.send(this.target,"rpc_request",{id:i,method:t,args:e})},e.exports=i},{72:72}],62:[function(t,e,n){"use strict";function i(t){this.bus=t,this.methods={},this.bus.register("rpc_request",o.bind(this._handleRequest,this))}var o=t(72);i.prototype._handleRequest=function(t){var e,n=t.content,i=n.args||[],o=this.methods[n.method];"function"==typeof o&&(e=function(){t.reply("rpc_response",{id:n.id,response:Array.prototype.slice.call(arguments)})},i.push(e),o.apply(null,i))},i.prototype.reset=function(){this.methods={}},i.prototype.define=function(t,e){this.methods[t]=e},e.exports=i},{72:72}],63:[function(t,e,n){var i=t(58),o=t(59),r=t(60),s=t(61),a=t(62);e.exports={MessageBus:i,PubsubClient:o,PubsubServer:r,RPCClient:s,RPCServer:a}},{58:58,59:59,60:60,61:61,62:62}],64:[function(t,e,n){arguments[4][15][0].apply(n,arguments)},{15:15}],65:[function(t,e,n){arguments[4][16][0].apply(n,arguments)},{16:16}],66:[function(t,e,n){arguments[4][17][0].apply(n,arguments)},{17:17}],67:[function(t,e,n){arguments[4][18][0].apply(n,arguments)},{18:18}],68:[function(t,e,n){arguments[4][19][0].apply(n,arguments)},{19:19}],69:[function(t,e,n){arguments[4][20][0].apply(n,arguments)},{20:20}],70:[function(t,e,n){arguments[4][21][0].apply(n,arguments)},{21:21,64:64}],71:[function(t,e,n){arguments[4][22][0].apply(n,arguments)},{22:22}],72:[function(t,e,n){arguments[4][23][0].apply(n,arguments)},{23:23,64:64,65:65,66:66,67:67,68:68,69:69,70:70,71:71}],73:[function(t,e,n){arguments[4][15][0].apply(n,arguments)},{15:15}],74:[function(t,e,n){arguments[4][16][0].apply(n,arguments)},{16:16}],75:[function(t,e,n){arguments[4][17][0].apply(n,arguments)},{17:17}],76:[function(t,e,n){arguments[4][18][0].apply(n,arguments)},{18:18}],77:[function(t,e,n){arguments[4][19][0].apply(n,arguments)},{19:19}],78:[function(t,e,n){arguments[4][20][0].apply(n,arguments)},{20:20}],79:[function(t,e,n){arguments[4][21][0].apply(n,arguments)},{21:21,73:73}],80:[function(t,e,n){arguments[4][22][0].apply(n,arguments)},{22:22}],81:[function(t,e,n){arguments[4][23][0].apply(n,arguments)},{23:23,73:73,74:74,75:75,76:76,77:77,78:78,79:79,80:80}],82:[function(t,e,n){"use strict";function i(t){if(!(this instanceof i))return new i(t);var e,n=r(t.className).split(/\s+/);for(this._elem=t,this.length=0,e=0;e<n.length;e+=1)n[e]&&s.push.call(this,n[e])}e.exports=i;var o=t(83),r=t(84),s=Array.prototype;i.prototype.add=function(){var t,e;for(e=0;e<arguments.length;e+=1)t=""+arguments[e],o(this,t)>=0||s.push.call(this,t);return this._elem.className=this.toString(),this},i.prototype.remove=function(){var t,e,n;for(n=0;n<arguments.length;n+=1)e=""+arguments[n],t=o(this,e),0>t||s.splice.call(this,t,1);return this._elem.className=this.toString(),this},i.prototype.contains=function(t){return t+="",o(this,t)>=0},i.prototype.toggle=function(t,e){return t+="",e===!0?this.add(t):e===!1?this.remove(t):this[this.contains(t)?"remove":"add"](t)},i.prototype.toString=function(){return s.join.call(this," ")}},{83:83,84:84}],83:[function(t,e,n){e.exports=function(t,e){if(t.indexOf)return t.indexOf(e);for(var n=0;n<t.length;++n)if(t[n]===e)return n;return-1}},{}],84:[function(t,e,n){function i(t){return t.replace(/^\s*|\s*$/g,"")}n=e.exports=i,n.left=function(t){return t.replace(/^\s*/,"")},n.right=function(t){return t.replace(/\s*$/,"")}},{}],85:[function(t,e,n){"use strict";function i(){this._teardownRegistry=[]}var o=t(86),r=t(87);i.prototype.registerFunctionForTeardown=function(t){r.isFunction(t)&&this._teardownRegistry.push(t)},i.prototype.teardown=function(t){o(this._teardownRegistry,r.bind(function(e){this._teardownRegistry=[],r.isFunction(t)&&t(e)},this))},e.exports=i},{86:86,87:87}],86:[function(t,e,n){"use strict";function i(t,e){var n,i=0===t.length;i?(t(),e(null)):(n=o(e),t(n))}function o(t){var e=!1;return function(){e||(e=!0,t.apply(this,arguments))}}e.exports=function(t,e){var n=t.length,o=n;if(0===n)return void e(null);for(var r=0;n>r;r++)i(t[r],function(t){return t?void e(t):(o-=1,void(0===o&&e(null)))})}},{}],87:[function(t,e,n){arguments[4][19][0].apply(n,arguments)},{19:19}],88:[function(t,e,n){(function(t){"use strict";function n(t){if(("string"==typeof t||t instanceof String)&&(t=document.getElementById(t)),!(t instanceof HTMLFormElement))throw new TypeError("FormNapper requires an HTMLFormElement element or the id string of one.");this.htmlForm=t}n.prototype.hijack=function(e){this.submitHandler||(this.submitHandler=function(t){t.preventDefault?t.preventDefault():t.returnValue=!1,e(t)},null!=t.addEventListener?this.htmlForm.addEventListener("submit",this.submitHandler,!1):null!=t.attachEvent?this.htmlForm.attachEvent("onsubmit",this.submitHandler):this.htmlForm.onsubmit=this.submitHandler)},n.prototype.inject=function(t,e){var n=this.htmlForm.querySelector('input[name="'+t+'"]');return null==n&&(n=document.createElement("input"),n.type="hidden",n.name=t,this.htmlForm.appendChild(n)),n.value=e,n},n.prototype.submit=function(){HTMLFormElement.prototype.submit.call(this.htmlForm)},n.prototype.detach=function(){this.submitHandler&&(null!=t.removeEventListener?this.htmlForm.removeEventListener("submit",this.submitHandler,!1):null!=t.detachEvent?this.htmlForm.detachEvent("onsubmit",this.submitHandler):this.htmlForm.onsubmit=null,delete this.submitHandler)},e.exports=n}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],89:[function(e,n,i){"use strict";!function(e,o){"object"==typeof i&&"undefined"!=typeof n?n.exports=o():"function"==typeof t&&t.amd?t([],o):e.framebus=o()}(this,function(){function t(t){return null==t?!1:null==t.Window?!1:t.constructor!==t.Window?!1:(_.push(t),!0)}function e(t){var e,n={};for(e in v)v.hasOwnProperty(e)&&(n[e]=v[e]);return n._origin=t||"*",n}function n(t){var e,n,i=r(this);return s(t)?!1:s(i)?!1:(n=Array.prototype.slice.call(arguments,1),e=a(t,n,i),e===!1?!1:(f(g.top,e,i),!0))}function i(t,e){var n=r(this);return y(t,e,n)?!1:(b[n]=b[n]||{},b[n][t]=b[n][t]||[],b[n][t].push(e),!0)}function o(t,e){var n,i,o=r(this);if(y(t,e,o))return!1;if(i=b[o]&&b[o][t],!i)return!1;for(n=0;n<i.length;n++)if(i[n]===e)return i.splice(n,1),!0;return!1}function r(t){return t&&t._origin||"*"}function s(t){return"string"!=typeof t}function a(t,e,n){var i=!1,o={event:t,origin:n},r=e[e.length-1];"function"==typeof r&&(o.reply=m(r,n),e=e.slice(0,-1)),o.args=e;try{i=E+JSON.stringify(o)}catch(s){throw new Error("Could not stringify event: "+s.message)}return i}function c(t){var e,n,i,o;if(t.data.slice(0,E.length)!==E)return!1;try{e=JSON.parse(t.data.slice(E.length))}catch(r){return!1}return null!=e.reply&&(n=t.origin,i=t.source,o=e.reply,e.reply=function(t){var e=a(o,[t],n);return e===!1?!1:void i.postMessage(e,n)},e.args.push(e.reply)),e}function u(t){g||(g=t||window,g.addEventListener?g.addEventListener("message",h,!1):g.attachEvent?g.attachEvent("onmessage",h):null===g.onmessage?g.onmessage=h:g=null)}function l(){return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(t){var e=16*Math.random()|0,n="x"===t?e:3&e|8;return n.toString(16)})}function h(t){var e;s(t.data)||(e=c(t),e&&(p("*",e.event,e.args,t),p(t.origin,e.event,e.args,t),d(t.data,e.origin,t.source)))}function p(t,e,n,i){var o;if(b[t]&&b[t][e])for(o=0;o<b[t][e].length;o++)b[t][e][o].apply(i,n)}function f(t,e,n){var i;try{t.postMessage(e,n)}catch(o){return}for(t.opener&&t.opener!==t&&!t.opener.closed&&t.opener!==g&&f(t.opener.top,e,n),i=0;i<t.frames.length;i++)f(t.frames[i],e,n)}function d(t,e,n){var i,o;for(i=_.length-1;i>=0;i--)o=_[i],o.closed===!0?_=_.slice(i,1):n!==o&&f(o.top,t,e)}function m(t,e){function n(o,r){t(o,r),v.target(e).unsubscribe(i,n)}var i=l();return v.target(e).subscribe(i,n),i}function y(t,e,n){return s(t)?!0:"function"!=typeof e?!0:s(n)?!0:!1}var g,v,_=[],b={},E="/*framebus*/";return u(),v={target:e,include:t,publish:n,pub:n,trigger:n,emit:n,subscribe:i,sub:i,on:i,unsubscribe:o,unsub:o,off:o}})},{}],90:[function(t,e,n){"use strict";var i=t(155),o=t(154),r=t(92),s=t(91);e.exports=function(t){var e=document.createElement("iframe"),n=i({},s,t);return n.style&&!o(n.style)&&(i(e.style,n.style),delete n.style),r(e,n),e.getAttribute("id")||(e.id=e.name),e}},{154:154,155:155,91:91,92:92}],91:[function(t,e,n){e.exports={src:"about:blank",frameBorder:0,allowtransparency:!0,scrolling:"no"}},{}],92:[function(t,e,n){e.exports=function(t,e){var n;for(var i in e)e.hasOwnProperty(i)&&(n=e[i],null==n?t.removeAttribute(i):t.setAttribute(i,n))}},{}],93:[function(t,e,n){function i(t){if(c(t)&&!a(t)&&!(t instanceof o)){if(t instanceof r)return t;if(h.call(t,"__chain__")&&h.call(t,"__wrapped__"))return u(t)}return new r(t)}var o=t(98),r=t(99),s=t(112),a=t(150),c=t(138),u=t(147),l=Object.prototype,h=l.hasOwnProperty;i.prototype=s.prototype,e.exports=i},{112:112,138:138,147:147,150:150,98:98,99:99}],94:[function(t,e,n){var i=t(129),o=i(Date,"now"),r=o||function(){return(new Date).getTime()};e.exports=r},{129:129}],95:[function(t,e,n){var i=t(125),o=t(143),r=t(97),s=1,a=32,c=r(function(t,e,n){var r=s;if(n.length){var u=o(n,c.placeholder);r|=a}return i(t,r,e,n,u)});c.placeholder={},e.exports=c},{125:125,143:143,97:97}],96:[function(t,e,n){var i=t(108),o=t(125),r=t(157),s=t(97),a=1,c=s(function(t,e){e=e.length?i(e):r(t);for(var n=-1,s=e.length;++n<s;){var c=e[n];t[c]=o(t[c],a,t)}return t});e.exports=c},{108:108,125:125,157:157,97:97}],97:[function(t,e,n){function i(t,e){if("function"!=typeof t)throw new TypeError(o);return e=r(void 0===e?t.length-1:+e||0,0),function(){for(var n=arguments,i=-1,o=r(n.length-e,0),s=Array(o);++i<o;)s[i]=n[e+i];switch(e){case 0:return t.call(this,s);case 1:return t.call(this,n[0],s);case 2:return t.call(this,n[0],n[1],s)}var a=Array(e+1);for(i=-1;++i<e;)a[i]=n[i];return a[e]=s,t.apply(this,a)}}var o="Expected a function",r=Math.max;e.exports=i},{}],98:[function(t,e,n){function i(t){this.__wrapped__=t,this.__actions__=[],this.__dir__=1,this.__filtered__=!1,this.__iteratees__=[],this.__takeCount__=s,this.__views__=[]}var o=t(107),r=t(112),s=Number.POSITIVE_INFINITY;i.prototype=o(r.prototype),i.prototype.constructor=i,e.exports=i},{107:107,112:112}],99:[function(t,e,n){function i(t,e,n){this.__wrapped__=t,this.__actions__=n||[],this.__chain__=!!e}var o=t(107),r=t(112);i.prototype=o(r.prototype),i.prototype.constructor=i,e.exports=i},{107:107,112:112}],100:[function(t,e,n){function i(t,e){var n=-1,i=t.length;for(e||(e=Array(i));++n<i;)e[n]=t[n];return e}e.exports=i},{}],101:[function(t,e,n){function i(t,e){for(var n=-1,i=t.length;++n<i&&e(t[n],n,t)!==!1;);return t}e.exports=i},{}],102:[function(t,e,n){function i(t,e){for(var n=-1,i=e.length,o=t.length;++n<i;)t[o+n]=e[n];return t}e.exports=i},{}],103:[function(t,e,n){function i(t,e,n){for(var i=-1,r=o(e),s=r.length;++i<s;){var a=r[i],c=t[a],u=n(c,e[a],a,t,e);(u===u?u===c:c!==c)&&(void 0!==c||a in t)||(t[a]=u)}return t}var o=t(158);e.exports=i},{158:158}],104:[function(t,e,n){function i(t,e){return null==e?t:o(e,r(e),t)}var o=t(106),r=t(158);e.exports=i},{106:106,158:158}],105:[function(t,e,n){function i(t,e,n,d,m,y,g){var _;if(n&&(_=m?n(t,d,m):n(t)),void 0!==_)return _;if(!p(t))return t;var b=h(t);if(b){if(_=c(t),!e)return o(t,_)}else{var w=k.call(t),A=w==v;if(w!=E&&w!=f&&(!A||m))return L[w]?u(t,w,e):m?t:{};if(_=l(A?{}:t),!e)return s(_,t)}y||(y=[]),g||(g=[]);for(var C=y.length;C--;)if(y[C]==t)return g[C];return y.push(t),g.push(_),(b?r:a)(t,function(o,r){_[r]=i(o,e,n,r,t,y,g)}),_}var o=t(100),r=t(101),s=t(104),a=t(110),c=t(130),u=t(131),l=t(132),h=t(150),p=t(153),f="[object Arguments]",d="[object Array]",m="[object Boolean]",y="[object Date]",g="[object Error]",v="[object Function]",_="[object Map]",b="[object Number]",E="[object Object]",w="[object RegExp]",A="[object Set]",C="[object String]",N="[object WeakMap]",T="[object ArrayBuffer]",I="[object Float32Array]",S="[object Float64Array]",x="[object Int8Array]",P="[object Int16Array]",O="[object Int32Array]",R="[object Uint8Array]",D="[object Uint8ClampedArray]",M="[object Uint16Array]",U="[object Uint32Array]",L={};L[f]=L[d]=L[T]=L[m]=L[y]=L[I]=L[S]=L[x]=L[P]=L[O]=L[b]=L[E]=L[w]=L[C]=L[R]=L[D]=L[M]=L[U]=!0,L[g]=L[v]=L[_]=L[A]=L[N]=!1;var F=Object.prototype,k=F.toString;e.exports=i},{100:100,101:101,104:104,110:110,130:130,131:131,132:132,150:150,153:153}],106:[function(t,e,n){function i(t,e,n){n||(n={});for(var i=-1,o=e.length;++i<o;){var r=e[i];n[r]=t[r]}return n}e.exports=i},{}],107:[function(t,e,n){var i=t(153),o=function(){function t(){}return function(e){if(i(e)){t.prototype=e;var n=new t;t.prototype=void 0}return n||{}}}();e.exports=o},{153:153}],108:[function(t,e,n){function i(t,e,n,u){u||(u=[]);for(var l=-1,h=t.length;++l<h;){var p=t[l];c(p)&&a(p)&&(n||s(p)||r(p))?e?i(p,e,n,u):o(u,p):n||(u[u.length]=p)}return u}var o=t(102),r=t(149),s=t(150),a=t(133),c=t(138);e.exports=i},{102:102,133:133,138:138,149:149,150:150}],109:[function(t,e,n){var i=t(120),o=i();e.exports=o},{120:120}],110:[function(t,e,n){function i(t,e){return o(t,e,r)}var o=t(109),r=t(158);e.exports=i},{109:109,158:158}],111:[function(t,e,n){function i(t,e){for(var n=-1,i=e.length,r=-1,s=[];++n<i;){var a=e[n];o(t[a])&&(s[++r]=a)}return s}var o=t(151);e.exports=i},{151:151}],112:[function(t,e,n){function i(){}e.exports=i},{}],113:[function(t,e,n){function i(t){return function(e){return null==e?void 0:e[t]}}e.exports=i},{}],114:[function(t,e,n){var i=t(160),o=t(140),r=o?function(t,e){return o.set(t,e),t}:i;e.exports=r},{140:140,160:160}],115:[function(t,e,n){function i(t,e,n){if("function"!=typeof t)return o;if(void 0===e)return t;switch(n){case 1:return function(n){return t.call(e,n)};case 3:return function(n,i,o){return t.call(e,n,i,o)};case 4:return function(n,i,o,r){return t.call(e,n,i,o,r)};case 5:return function(n,i,o,r,s){return t.call(e,n,i,o,r,s)}}return function(){return t.apply(e,arguments)}}var o=t(160);e.exports=i},{160:160}],116:[function(t,e,n){(function(t){function n(t){var e=new i(t.byteLength),n=new o(e);return n.set(new o(t)),e}var i=t.ArrayBuffer,o=t.Uint8Array;e.exports=n}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],117:[function(t,e,n){function i(t,e,n){for(var i=n.length,r=-1,s=o(t.length-i,0),a=-1,c=e.length,u=Array(c+s);++a<c;)u[a]=e[a];for(;++r<i;)u[n[r]]=t[r];for(;s--;)u[a++]=t[r++];return u}var o=Math.max;e.exports=i},{}],118:[function(t,e,n){function i(t,e,n){for(var i=-1,r=n.length,s=-1,a=o(t.length-r,0),c=-1,u=e.length,l=Array(a+u);++s<a;)l[s]=t[s];for(var h=s;++c<u;)l[h+c]=e[c];for(;++i<r;)l[h+n[i]]=t[s++];return l}var o=Math.max;e.exports=i},{}],119:[function(t,e,n){function i(t){return s(function(e,n){var i=-1,s=null==e?0:n.length,a=s>2?n[s-2]:void 0,c=s>2?n[2]:void 0,u=s>1?n[s-1]:void 0;for("function"==typeof a?(a=o(a,u,5),s-=2):(a="function"==typeof u?u:void 0,s-=a?1:0),c&&r(n[0],n[1],c)&&(a=3>s?void 0:a,s=1);++i<s;){var l=n[i];l&&t(e,l,a)}return e})}var o=t(115),r=t(135),s=t(97);e.exports=i},{115:115,135:135,97:97}],120:[function(t,e,n){function i(t){return function(e,n,i){for(var r=o(e),s=i(e),a=s.length,c=t?a:-1;t?c--:++c<a;){var u=s[c];if(n(r[u],u,r)===!1)break}return e}}var o=t(146);e.exports=i},{146:146}],121:[function(t,e,n){(function(n){function i(t,e){function i(){var o=this&&this!==n&&this instanceof i?r:t;return o.apply(e,arguments)}var r=o(t);return i}var o=t(122);e.exports=i}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{122:122}],122:[function(t,e,n){function i(t){return function(){var e=arguments;switch(e.length){case 0:return new t;case 1:return new t(e[0]);case 2:return new t(e[0],e[1]);case 3:return new t(e[0],e[1],e[2]);case 4:return new t(e[0],e[1],e[2],e[3]);case 5:return new t(e[0],e[1],e[2],e[3],e[4]);case 6:return new t(e[0],e[1],e[2],e[3],e[4],e[5]);case 7:return new t(e[0],e[1],e[2],e[3],e[4],e[5],e[6])}var n=o(t.prototype),i=t.apply(n,e);return r(i)?i:n}}var o=t(107),r=t(153);e.exports=i},{107:107,153:153}],123:[function(t,e,n){(function(n){function i(t,e,E,w,A,C,N,T,I,S){function x(){for(var d=arguments.length,m=d,y=Array(d);m--;)y[m]=arguments[m];if(w&&(y=r(y,w,A)),C&&(y=s(y,C,N)),D||U){var _=x.placeholder,F=l(y,_);if(d-=F.length,S>d){var k=T?o(T):void 0,j=b(S-d,0),B=D?F:void 0,V=D?void 0:F,H=D?y:void 0,z=D?void 0:y;e|=D?g:v,e&=~(D?v:g),M||(e&=~(p|f));var Y=[t,e,E,H,B,z,V,k,I,j],G=i.apply(void 0,Y);return c(t)&&h(G,Y),G.placeholder=_,G}}var W=O?E:this,q=R?W[t]:t;return T&&(y=u(y,T)),P&&I<y.length&&(y.length=I),this&&this!==n&&this instanceof x&&(q=L||a(t)),q.apply(W,y)}var P=e&_,O=e&p,R=e&f,D=e&m,M=e&d,U=e&y,L=R?void 0:a(t);return x}var o=t(100),r=t(117),s=t(118),a=t(122),c=t(136),u=t(142),l=t(143),h=t(144),p=1,f=2,d=4,m=8,y=16,g=32,v=64,_=128,b=Math.max;e.exports=i}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{100:100,117:117,118:118,122:122,136:136,142:142,143:143,144:144}],124:[function(t,e,n){(function(n){function i(t,e,i,s){function a(){for(var e=-1,o=arguments.length,r=-1,l=s.length,h=Array(l+o);++r<l;)h[r]=s[r];for(;o--;)h[r++]=arguments[++e];var p=this&&this!==n&&this instanceof a?u:t;return p.apply(c?i:this,h)}var c=e&r,u=o(t);return a}var o=t(122),r=1;e.exports=i}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{122:122}],125:[function(t,e,n){function i(t,e,n,i,g,v,_,b){var E=e&p;if(!E&&"function"!=typeof t)throw new TypeError(m);var w=i?i.length:0;if(w||(e&=~(f|d),i=g=void 0),w-=g?g.length:0,e&d){var A=i,C=g;i=g=void 0}var N=E?void 0:c(t),T=[t,e,n,i,g,A,C,v,_,b];if(N&&(u(T,N),e=T[1],b=T[9]),T[9]=null==b?E?0:t.length:y(b-w,0)||0,e==h)var I=r(T[0],T[2]);else I=e!=f&&e!=(h|f)||T[4].length?s.apply(void 0,T):a.apply(void 0,T);var S=N?o:l;return S(I,T)}var o=t(114),r=t(121),s=t(123),a=t(124),c=t(126),u=t(139),l=t(144),h=1,p=2,f=32,d=64,m="Expected a function",y=Math.max;e.exports=i},{114:114,121:121,123:123,124:124,126:126,139:139,144:144}],126:[function(t,e,n){var i=t(140),o=t(161),r=i?function(t){return i.get(t)}:o;e.exports=r},{140:140,161:161}],127:[function(t,e,n){function i(t){for(var e=t.name+"",n=o[e],i=n?n.length:0;i--;){var r=n[i],s=r.func;if(null==s||s==t)return r.name}return e}var o=t(141);e.exports=i},{141:141}],128:[function(t,e,n){var i=t(113),o=i("length");e.exports=o},{113:113}],129:[function(t,e,n){function i(t,e){var n=null==t?void 0:t[e];return o(n)?n:void 0}var o=t(152);e.exports=i},{152:152}],130:[function(t,e,n){function i(t){var e=t.length,n=new t.constructor(e);return e&&"string"==typeof t[0]&&r.call(t,"index")&&(n.index=t.index,n.input=t.input),n}var o=Object.prototype,r=o.hasOwnProperty;e.exports=i},{}],131:[function(t,e,n){function i(t,e,n){var i=t.constructor;switch(e){case l:return o(t);case r:case s:return new i(+t);case h:case p:case f:case d:case m:case y:case g:case v:case _:var E=t.buffer;return new i(n?o(E):E,t.byteOffset,t.length);case a:case u:return new i(t);case c:var w=new i(t.source,b.exec(t));w.lastIndex=t.lastIndex}return w}var o=t(116),r="[object Boolean]",s="[object Date]",a="[object Number]",c="[object RegExp]",u="[object String]",l="[object ArrayBuffer]",h="[object Float32Array]",p="[object Float64Array]",f="[object Int8Array]",d="[object Int16Array]",m="[object Int32Array]",y="[object Uint8Array]",g="[object Uint8ClampedArray]",v="[object Uint16Array]",_="[object Uint32Array]",b=/\w*$/;e.exports=i},{116:116}],132:[function(t,e,n){function i(t){var e=t.constructor;return"function"==typeof e&&e instanceof e||(e=Object),new e}e.exports=i},{}],133:[function(t,e,n){function i(t){return null!=t&&r(o(t))}var o=t(128),r=t(137);e.exports=i},{128:128,137:137}],134:[function(t,e,n){function i(t,e){return t="number"==typeof t||o.test(t)?+t:-1,e=null==e?r:e,t>-1&&t%1==0&&e>t}var o=/^\d+$/,r=9007199254740991;e.exports=i},{}],135:[function(t,e,n){function i(t,e,n){if(!s(n))return!1;var i=typeof e;if("number"==i?o(n)&&r(e,n.length):"string"==i&&e in n){var a=n[e];return t===t?t===a:a!==a}return!1}var o=t(133),r=t(134),s=t(153);e.exports=i},{133:133,134:134,153:153}],136:[function(t,e,n){function i(t){var e=s(t),n=a[e];if("function"!=typeof n||!(e in o.prototype))return!1;if(t===n)return!0;var i=r(n);return!!i&&t===i[0]}var o=t(98),r=t(126),s=t(127),a=t(93);e.exports=i},{126:126,127:127,93:93,98:98}],137:[function(t,e,n){function i(t){return"number"==typeof t&&t>-1&&t%1==0&&o>=t}var o=9007199254740991;e.exports=i},{}],138:[function(t,e,n){function i(t){return!!t&&"object"==typeof t}e.exports=i},{}],139:[function(t,e,n){function i(t,e){var n=t[1],i=e[1],m=n|i,y=h>m,g=i==h&&n==l||i==h&&n==p&&t[7].length<=e[8]||i==(h|p)&&n==l;if(!y&&!g)return t;i&c&&(t[2]=e[2],m|=n&c?0:u);var v=e[3];if(v){var _=t[3];t[3]=_?r(_,v,e[4]):o(v),t[4]=_?a(t[3],f):o(e[4])}return v=e[5],v&&(_=t[5],t[5]=_?s(_,v,e[6]):o(v),t[6]=_?a(t[5],f):o(e[6])),v=e[7],v&&(t[7]=o(v)),i&h&&(t[8]=null==t[8]?e[8]:d(t[8],e[8])),null==t[9]&&(t[9]=e[9]),t[0]=e[0],t[1]=m,t}var o=t(100),r=t(117),s=t(118),a=t(143),c=1,u=4,l=8,h=128,p=256,f="__lodash_placeholder__",d=Math.min;e.exports=i},{100:100,117:117,118:118,143:143}],140:[function(t,e,n){(function(n){var i=t(129),o=i(n,"WeakMap"),r=o&&new o;e.exports=r}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{129:129}],141:[function(t,e,n){var i={};e.exports=i},{}],142:[function(t,e,n){function i(t,e){for(var n=t.length,i=s(e.length,n),a=o(t);i--;){var c=e[i];t[i]=r(c,n)?a[c]:void 0}return t}var o=t(100),r=t(134),s=Math.min;e.exports=i},{100:100,134:134}],143:[function(t,e,n){function i(t,e){for(var n=-1,i=t.length,r=-1,s=[];++n<i;)t[n]===e&&(t[n]=o,s[++r]=n);return s}var o="__lodash_placeholder__";e.exports=i},{}],144:[function(t,e,n){var i=t(114),o=t(94),r=150,s=16,a=function(){var t=0,e=0;return function(n,a){var c=o(),u=s-(c-e);if(e=c,u>0){if(++t>=r)return n}else t=0;return i(n,a)}}();e.exports=a},{114:114,94:94}],145:[function(t,e,n){function i(t){for(var e=c(t),n=e.length,i=n&&t.length,u=!!i&&a(i)&&(r(t)||o(t)),h=-1,p=[];++h<n;){var f=e[h];(u&&s(f,i)||l.call(t,f))&&p.push(f)}return p}var o=t(149),r=t(150),s=t(134),a=t(137),c=t(159),u=Object.prototype,l=u.hasOwnProperty;e.exports=i},{134:134,137:137,149:149,150:150,159:159}],146:[function(t,e,n){function i(t){return o(t)?t:Object(t)}var o=t(153);e.exports=i},{153:153}],147:[function(t,e,n){function i(t){return t instanceof o?t.clone():new r(t.__wrapped__,t.__chain__,s(t.__actions__))}var o=t(98),r=t(99),s=t(100);e.exports=i},{100:100,98:98,99:99}],148:[function(t,e,n){function i(t,e,n){return"function"==typeof e?o(t,!0,r(e,n,3)):o(t,!0)}var o=t(105),r=t(115);e.exports=i},{105:105,115:115}],149:[function(t,e,n){function i(t){return r(t)&&o(t)&&a.call(t,"callee")&&!c.call(t,"callee")}var o=t(133),r=t(138),s=Object.prototype,a=s.hasOwnProperty,c=s.propertyIsEnumerable;e.exports=i},{133:133,138:138}],150:[function(t,e,n){var i=t(129),o=t(137),r=t(138),s="[object Array]",a=Object.prototype,c=a.toString,u=i(Array,"isArray"),l=u||function(t){return r(t)&&o(t.length)&&c.call(t)==s};e.exports=l},{129:129,137:137,138:138}],151:[function(t,e,n){function i(t){return o(t)&&a.call(t)==r}var o=t(153),r="[object Function]",s=Object.prototype,a=s.toString;e.exports=i},{153:153}],152:[function(t,e,n){function i(t){return null==t?!1:o(t)?l.test(c.call(t)):r(t)&&s.test(t)}var o=t(151),r=t(138),s=/^\[object .+?Constructor\]$/,a=Object.prototype,c=Function.prototype.toString,u=a.hasOwnProperty,l=RegExp("^"+c.call(u).replace(/[\\^$.*+?()[\]{}|]/g,"\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g,"$1.*?")+"$");e.exports=i},{138:138,151:151}],153:[function(t,e,n){function i(t){var e=typeof t;return!!t&&("object"==e||"function"==e)}e.exports=i},{}],154:[function(t,e,n){function i(t){return"string"==typeof t||o(t)&&a.call(t)==r}var o=t(138),r="[object String]",s=Object.prototype,a=s.toString;e.exports=i},{138:138}],155:[function(t,e,n){var i=t(103),o=t(104),r=t(119),s=r(function(t,e,n){return n?i(t,e,n):o(t,e)});e.exports=s},{103:103,104:104,119:119}],156:[function(t,e,n){function i(t,e,n){var i=r(t);return n&&s(t,e,n)&&(e=void 0),e?o(i,e):i}var o=t(104),r=t(107),s=t(135);e.exports=i},{104:104,107:107,135:135}],157:[function(t,e,n){function i(t){return o(t,r(t))}var o=t(111),r=t(159);e.exports=i},{111:111,159:159}],158:[function(t,e,n){var i=t(129),o=t(133),r=t(153),s=t(145),a=i(Object,"keys"),c=a?function(t){var e=null==t?void 0:t.constructor;return"function"==typeof e&&e.prototype===t||"function"!=typeof t&&o(t)?s(t):r(t)?a(t):[]}:s;e.exports=c},{129:129,133:133,145:145,153:153}],159:[function(t,e,n){function i(t){if(null==t)return[];c(t)||(t=Object(t));var e=t.length;e=e&&a(e)&&(r(t)||o(t))&&e||0;for(var n=t.constructor,i=-1,u="function"==typeof n&&n.prototype===t,h=Array(e),p=e>0;++i<e;)h[i]=i+"";for(var f in t)p&&s(f,e)||"constructor"==f&&(u||!l.call(t,f))||h.push(f);return h}var o=t(149),r=t(150),s=t(134),a=t(137),c=t(153),u=Object.prototype,l=u.hasOwnProperty;e.exports=i},{134:134,137:137,149:149,150:150,153:153}],160:[function(t,e,n){function i(t){return t}e.exports=i},{}],161:[function(t,e,n){function i(){}e.exports=i},{}],162:[function(t,e,n){function i(t){try{return Array.prototype.slice.call(t)}catch(e){for(var n=[],i=0;i<t.length;i++)n.push(t[i]);return n}}"undefined"!=typeof e&&(e.exports=i)},{}],163:[function(t,e,n){"use strict";function i(t){if(t=t||{},this.channel=t.channel,!this.channel)throw new Error("Channel ID must be specified");this.merchantUrl=t.merchantUrl,this._isDestroyed=!1,this._isVerbose=!1,this._listeners=[],this._log("new bus on channel "+this.channel,[location.href]);

}var o=t(89),r=t(165),s=t(164).checkOrigin;i.prototype.on=function(t,e){var n,i,r=e,a=this;this._isDestroyed||(this.merchantUrl&&(r=function(){s(this.origin,a.merchantUrl)&&e.apply(this,arguments)}),n=this._namespaceEvent(t),i=Array.prototype.slice.call(arguments),i[0]=n,i[1]=r,this._log("on",i),o.on.apply(o,i),this._listeners.push({eventName:t,handler:r,originalHandler:e}))},i.prototype.emit=function(t){var e;this._isDestroyed||(e=Array.prototype.slice.call(arguments),e[0]=this._namespaceEvent(t),this._log("emit",e),o.emit.apply(o,e))},i.prototype._offDirect=function(t){var e=Array.prototype.slice.call(arguments);this._isDestroyed||(e[0]=this._namespaceEvent(t),this._log("off",e),o.off.apply(o,e))},i.prototype.off=function(t,e){var n,i,o=e;if(!this._isDestroyed){if(this.merchantUrl)for(n=0;n<this._listeners.length;n++)i=this._listeners[n],i.originalHandler===e&&(o=i.handler);this._offDirect(t,o)}},i.prototype._namespaceEvent=function(t){return["braintree",this.channel,t].join(":")},i.prototype.teardown=function(){var t,e;for(e=0;e<this._listeners.length;e++)t=this._listeners[e],this._offDirect(t.eventName,t.handler);this._listeners.length=0,this._isDestroyed=!0},i.prototype._log=function(t,e){this._isVerbose&&console.log(t,e)},i.events=r,e.exports=i},{164:164,165:165,89:89}],164:[function(t,e,n){"use strict";function i(t,e){var n,i,r=document.createElement("a");return r.href=e,i="https:"===r.protocol?r.host.replace(/:443$/,""):"http:"===r.protocol?r.host.replace(/:80$/,""):r.host,n=r.protocol+"//"+i,n===t||o.test(t)}var o=/^https:\/\/([a-zA-Z0-9-]+\.)*(braintreepayments|braintreegateway|paypal)\.com(:\d{1,5})?$/;e.exports={checkOrigin:i}},{}],165:[function(t,e,n){"use strict";var i,o,r=["PAYMENT_METHOD_REQUEST","PAYMENT_METHOD_RECEIVED","PAYMENT_METHOD_GENERATED","PAYMENT_METHOD_NOT_GENERATED","PAYMENT_METHOD_CANCELLED","PAYMENT_METHOD_ERROR","CONFIGURATION_REQUEST","ROOT_METADATA_REQUEST","ERROR","WARNING","UI_POPUP_DID_OPEN","UI_POPUP_DID_CLOSE","UI_POPUP_FORCE_CLOSE","ASYNC_DEPENDENCY_INITIALIZING","ASYNC_DEPENDENCY_READY","USER_FORM_SUBMIT_REQUEST","SEND_ANALYTICS_EVENTS"],s={};for(i=0;i<r.length;i++)o=r[i],s[o]=o;e.exports=s},{}],166:[function(t,e,n){"use strict";function i(t){var e,n={};if(t){for(e in t)t.hasOwnProperty(e)&&(n[o(e)]=t[e]);return n}}function o(t){return t.replace(/([A-Z])/g,function(t){return"_"+t.toLowerCase()})}e.exports={convertToLegacyShippingAddress:i}},{}],167:[function(t,e,n){"use strict";e.exports={ROOT_SUCCESS_CALLBACK:"onPaymentMethodReceived",ROOT_ERROR_CALLBACK:"onError",ROOT_READY_CALLBACK:"onReady",TEARDOWN_STATE:{IN_PROGRESS:"inProgress",COMPLETE:"complete"}}},{}],168:[function(t,e,n){(function(n){"use strict";function i(){}function o(){this._dependenciesRemaining++}function r(){this._dependenciesRemaining--,0===this._dependenciesRemaining&&(delete this._dependenciesRemaining,this.bus.off(u.events.ASYNC_DEPENDENCY_INITIALIZING,this._handleDependencyInitializing),this.bus.off(u.events.ASYNC_DEPENDENCY_READY,this._handleDependencyReady),this._onIntegrationReady())}function s(t){this.configuration=t,this.isReady=!1,this.destructor=new l,this.bus=new u({channel:this.configuration.channel,merchantUrl:n.location.href}),this.apiClient=new c.Client(this.configuration),this._configureCallbacks(),this._configureAnalytics(),this._attachEvents(),this._emitInitializing()}var a=t(148),c=t(14),u=t(163),l=t(85),h=t(95),p=t(167),f=t(178),d=t(176),m=t(174),y=t(177),g=y.isJQueryElement,v=y.isHTMLElement,_=t(192);s.prototype._emitInitializing=function(){this.bus.emit(u.events.ASYNC_DEPENDENCY_INITIALIZING)},s.prototype._configureCallbacks=function(){function t(t){return function(e){t(f(e))}}var e=d(this.configuration.merchantConfiguration);this.onSuccess=t(e(p.ROOT_SUCCESS_CALLBACK)),this.onError=e(p.ROOT_ERROR_CALLBACK,m),this.onReady=e(p.ROOT_READY_CALLBACK)},s.prototype._configureAnalytics=function(){var t="web."+this.configuration.integrationType+".",e=this.apiClient;this.bus.on(u.events.SEND_ANALYTICS_EVENTS,function(n,i){var o;for(n instanceof Array||(n=[n]),o=0;o<n.length;o++)n[o]=t+n[o];e.sendAnalyticsEvents(n,i)})},s.prototype._attachEvents=function(){var t=a(this.configuration,function(t){return g(t)||v(t)?{}:void 0});this.bus.on(u.events.ERROR,this.onError),this.bus.on(u.events.PAYMENT_METHOD_RECEIVED,this.onSuccess),this.bus.on(u.events.WARNING,function(t){try{console.warn(t)}catch(e){}}),this.bus.on(u.events.CONFIGURATION_REQUEST,function(e){e(t)}),this._dependenciesRemaining=0,this._handleDependencyInitializing=h(o,this),this._handleDependencyReady=h(r,this),this.bus.on(u.events.ASYNC_DEPENDENCY_INITIALIZING,this._handleDependencyInitializing),this.bus.on(u.events.ASYNC_DEPENDENCY_READY,this._handleDependencyReady)},s.prototype._addDeviceData=function(t){var e;if(null!=this.configuration.merchantConfiguration.dataCollector){try{e=_.setup(this.configuration.merchantConfiguration.dataCollector)}catch(n){this.bus.emit(u.events.ERROR,{type:"CONFIGURATION",message:n.message})}null!=e&&(this.destructor.registerFunctionForTeardown(function(){e.teardown()}),t.deviceData=e.deviceData)}},s.prototype.teardown=function(t){if(this.teardownState===p.TEARDOWN_STATE.IN_PROGRESS)throw new Error("Cannot call teardown while in progress");if(this.teardownState===p.TEARDOWN_STATE.COMPLETE)throw new Error("Cannot teardown integration more than once");this.teardownMerchantCallback=t||i,this.teardownState=p.TEARDOWN_STATE.IN_PROGRESS,this.destructor.teardown(h(this._handleTeardown,this))},s.prototype._handleTeardown=function(){this.bus.teardown(),this.teardownState=p.TEARDOWN_STATE.COMPLETE,this.teardownMerchantCallback()},s.prototype._wrapWithTeardownReply=function(t,e){var n=this;return function(){if(n.teardownState===p.TEARDOWN_STATE.IN_PROGRESS)throw new Error("Cannot call "+t+" while teardown is in progress");if(n.teardownState===p.TEARDOWN_STATE.COMPLETE)throw new Error("Cannot call "+t+" after teardown has completed");e()}},s.prototype._onIntegrationReady=function(t){this.returnedInstance=t||{},this.returnedInstance.teardown=h(this.teardown,this),this._addDeviceData(t),this.isReady=!0,this.onReady(this.returnedInstance)},e.exports=s}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{14:14,148:148,163:163,167:167,174:174,176:176,177:177,178:178,192:192,85:85,95:95}],169:[function(t,e,n){"use strict";function i(){var t;u.apply(this,arguments),this._attachBusEvents(),t=a.create(o({},this.configuration,{apiClient:this.apiClient})),null!=t&&this.destructor.registerFunctionForTeardown(function(e){t.teardown(e)}),this.bus.emit(c.events.ASYNC_DEPENDENCY_READY)}var o=t(155),r=t(156),s=t(95),a=t(180),c=t(163),u=t(168);i.prototype=r(u.prototype,{constructor:i}),i.prototype._attachBusEvents=function(){this.bus.on(c.events.PAYMENT_METHOD_GENERATED,s(this._onPaymentMethodGenerated,this))},i.prototype._onPaymentMethodGenerated=function(t){this.bus.emit(c.events.PAYMENT_METHOD_RECEIVED,t)},e.exports=i},{155:155,156:156,163:163,168:168,180:180,95:95}],170:[function(t,e,n){"use strict";function i(){g.apply(this,arguments),null!=this.configuration.merchantConfiguration.hostedFields?this._setupHostedFields():this._setupForm(),this._setupPayPal(),this._setupCoinbase(),this.bus.emit(m.events.ASYNC_DEPENDENCY_READY)}function o(t,e){return function(n){return e in t&&h(t[e][n])?t[e][n]:function(){}}}var r=t(148),s=t(156),a=t(201),c=t(213),u=t(180),l=t(95),h=t(151),p=t(207),f=t(88),d=t(167),m=t(163),y=t(166).convertToLegacyShippingAddress,g=t(168),v=t(177),_=v.isJQueryElement,b=v.isHTMLElement,E=t(175);i.prototype=s(g.prototype,{constructor:i}),i.prototype._setupHostedFields=function(){var t,e=this.configuration.merchantConfiguration,n=e[d.ROOT_SUCCESS_CALLBACK],i=new f(e.id),o=p.create(this.configuration),r=new E({formNapper:i,rootCallback:n,channel:this.configuration.channel});return null==i.htmlForm?void this.bus.emit(m.events.ERROR,{type:"CONFIGURATION",message:"options.id does not reference a valid DOM element"}):(t=l(r.handleSubmitRequest,r),i.hijack(t),this.bus.on(m.events.USER_FORM_SUBMIT_REQUEST,t),void this.destructor.registerFunctionForTeardown(l(function(t){r.teardown(),i.detach(),o.teardown(t)},this)))},i.prototype._setupForm=function(){var t,e,n,i=this.configuration.merchantConfiguration;i.id?(n=a.setup(this.apiClient,this.configuration),t=!h(i[d.ROOT_SUCCESS_CALLBACK]),t||(e=this.onSuccess,n.onNonceReceived=l(function(t,n){t?this.bus.emit(m.events.ERROR,t):e(n)},this)),this.destructor.registerFunctionForTeardown(function(){n.teardown()})):this.bus.on(m.events.PAYMENT_METHOD_GENERATED,l(function(t){this.bus.emit(m.events.PAYMENT_METHOD_RECEIVED,t)},this))},i.prototype._setupPayPal=function(){var t,e,n,i,s,a,u;this.configuration.merchantConfiguration.paypal&&(t=r(this.configuration,function(t){return _(t)?t[0]:b(t)?t:void 0}),u=t.merchantConfiguration,a=u.paypal,e=o(u,"paypal"),n=e("onSuccess"),i=e("onCancelled"),a.paymentMethodNonceInputField||(s=document.createElement("input"),s.id="braintree-custom-integration-dummy-input",a.paymentMethodNonceInputField=s),a.onSuccess=function(t){n(t.nonce,t.details.email,y(t.details.shippingAddress))},a.onCancelled=function(){i()},u.enableCORS&&(a.enableCORS=!0),this.paypalIntegration=c.create(t),null!=this.paypalIntegration&&this.destructor.registerFunctionForTeardown(l(function(){this.paypalIntegration.teardown()},this)))},i.prototype._setupCoinbase=function(){var t,e;this.configuration.merchantConfiguration.coinbase&&(navigator.userAgent.match(/MSIE 8\.0/)||(t=r(this.configuration),t.apiClient=this.apiClient,e=u.create(t),null!=e&&this.destructor.registerFunctionForTeardown(function(t){e.teardown(t)})))},i.prototype._onIntegrationReady=function(){var t=this,e={};this.paypalIntegration&&(e.paypal={initAuthFlow:this._wrapWithTeardownReply("initAuthFlow",function(){t.bus.emit(m.events.SEND_ANALYTICS_EVENTS,"paypal.auth.init"),t.paypalIntegration.initAuthFlow()}),closeAuthFlow:this._wrapWithTeardownReply("closeAuthFlow",function(){t.bus.emit(m.events.SEND_ANALYTICS_EVENTS,"paypal.auth.close"),t.paypalIntegration.closeAuthFlow()})}),g.prototype._onIntegrationReady.call(this,e)},e.exports=i},{148:148,151:151,156:156,163:163,166:166,167:167,168:168,175:175,177:177,180:180,201:201,207:207,213:213,88:88,95:95}],171:[function(t,e,n){"use strict";function i(t){return l(t.paymentMethodNonceReceived)?t.paymentMethodNonceReceived:null}function o(t){return l(t[p.ROOT_SUCCESS_CALLBACK])}function r(){var t,e,n,r,a;d.apply(this,arguments),a=s(this.configuration),t=a.merchantConfiguration,e=i(t),n=o(t),(e||n)&&(t.paymentMethodNonceReceived=u(function(t){e&&e(t.originalEvent,t.nonce),this.bus.emit(h.events.PAYMENT_METHOD_RECEIVED,f(t))},this)),r=c.create(a),this.destructor.registerFunctionForTeardown(function(t){r.teardown(t)}),this.bus.emit(h.events.ASYNC_DEPENDENCY_READY)}var s=t(148),a=t(156),c=t(199),u=t(95),l=t(151),h=t(163),p=t(167),f=t(178),d=t(168);r.prototype=a(d.prototype,{constructor:r}),e.exports=r},{148:148,151:151,156:156,163:163,167:167,168:168,178:178,199:199,95:95}],172:[function(t,e,n){"use strict";e.exports={custom:t(170),dropin:t(171),paypal:t(173),coinbase:t(169)}},{169:169,170:170,171:171,173:173}],173:[function(t,e,n){"use strict";function i(t){return"onSuccess"in t&&l(t.onSuccess)?t.onSuccess:"paypal"in t&&l(t.paypal.onSuccess)?t.paypal.onSuccess:null}function o(t){return l(t[h.ROOT_SUCCESS_CALLBACK])}function r(t){var e,n,r,a;t=s(t),t.merchantConfiguration.paypal=t.merchantConfiguration.paypal||{};for(a in t.merchantConfiguration)t.merchantConfiguration.hasOwnProperty(a)&&"paypal"!==a&&(t.merchantConfiguration.paypal[a]=t.merchantConfiguration[a]);d.call(this,t),e=this.configuration.merchantConfiguration,n=i(e),r=o(e),(n||r)&&(e.paypal.onSuccess=u(function(t){n&&n(t.nonce,t.details.email,f(t.details.shippingAddress)),this.bus.emit(p.events.PAYMENT_METHOD_RECEIVED,t)},this)),this.paypalIntegration=c.create(this.configuration),this.destructor.registerFunctionForTeardown(u(function(){this.paypalIntegration.teardown()},this)),this.bus.emit(p.events.ASYNC_DEPENDENCY_READY)}var s=t(148),a=t(156),c=t(213),u=t(95),l=t(151),h=t(167),p=t(163),f=t(166).convertToLegacyShippingAddress,d=t(168);r.prototype=a(d.prototype,{constructor:r}),r.prototype._onIntegrationReady=function(){var t=this,e={};this.paypalIntegration&&(e.paypal={initAuthFlow:this._wrapWithTeardownReply("initAuthFlow",function(){t.bus.emit(p.events.SEND_ANALYTICS_EVENTS,"paypal.auth.init"),t.paypalIntegration.initAuthFlow()}),closeAuthFlow:this._wrapWithTeardownReply("closeAuthFlow",function(){t.bus.emit(p.events.SEND_ANALYTICS_EVENTS,"paypal.auth.close"),t.paypalIntegration.closeAuthFlow()})}),d.prototype._onIntegrationReady.call(this,e)},e.exports=r},{148:148,151:151,156:156,163:163,166:166,167:167,168:168,213:213,95:95}],174:[function(t,e,n){"use strict";e.exports=function(t){if("CONFIGURATION"===t.type||"IMMEDIATE"===t.type)throw new Error(t.message);try{console.error(-1===navigator.userAgent.indexOf("MSIE")?t:JSON.stringify(t,null,2))}catch(e){}}},{}],175:[function(t,e,n){"use strict";function i(t){this.paymentMethod=null,this.nonceInputElement=null,this.bus=new o({channel:t.channel}),this.formNapper=t.formNapper,this.rootCallback=t.rootCallback,this._attachEvents()}var o=t(163),r=t(207),s="web.custom.hosted-fields.via.",a="payment_method_nonce";i.prototype._shouldStrictlyValidate=function(t){return null!=t?!1:null==this.paymentMethod||"CreditCard"===this.paymentMethod.type},i.prototype._clearNonce=function(){this.paymentMethod=null,this.nonceInputElement=this.formNapper.inject(a,"")},i.prototype._attachEvents=function(){var t=this;this.bus.on(o.events.PAYMENT_METHOD_CANCELLED,function(){t._clearNonce()}),this.bus.on(o.events.PAYMENT_METHOD_GENERATED,function(e){t.paymentMethod=e,t.nonceInputElement=t.formNapper.inject(a,t.paymentMethod.nonce)})},i.prototype.handleSubmitRequest=function(){var t=this;this.bus.emit(r.events.TOKENIZATION_REQUEST,function(e){var n=e[0],i=e[1];return n?void t.bus.emit(o.events.ERROR,n):(t.paymentMethod=i||t.paymentMethod,t._shouldStrictlyValidate(i)?(t.bus.emit(r.events.VALIDATE_STRICT),void t.bus.emit(o.events.ERROR,{type:"VALIDATION",message:"User did not enter a payment method"})):void(t.rootCallback?t.bus.emit(o.events.SEND_ANALYTICS_EVENTS,s+"callback.success",function(){t.rootCallback(t.paymentMethod)}):t.bus.emit(o.events.SEND_ANALYTICS_EVENTS,s+"formsubmit.success",function(){t.nonceInputElement=t.formNapper.inject(a,t.paymentMethod.nonce),t.formNapper.submit()})))})},i.prototype.teardown=function(){this._clearNonce()},e.exports=i},{163:163,207:207}],176:[function(t,e,n){"use strict";function i(){}var o=t(151);e.exports=function(t){return function(e,n){return o(t[e])?t[e]:o(n)?n:i}}},{151:151}],177:[function(t,e,n){"use strict";function i(t){return Boolean(t)&&"object"==typeof t&&"jquery"in t&&0!==t.length}function o(t){return Boolean(t)&&1===t.nodeType}e.exports={isJQueryElement:i,isHTMLElement:o}},{}],178:[function(t,e,n){"use strict";e.exports=function(t){return{nonce:t.nonce,details:t.details,type:t.type}}},{}],179:[function(t,e,n){(function(n){"use strict";function i(t,e,i){var s;if(!c.hasOwnProperty(e))throw new Error(e+" is an unsupported integration");i=i||{},s=p.uuid(),r._getConfiguration({enableCORS:i.enableCORS||!1,authorization:t,sessionId:s},function(r,a){var f;return r?(f=h(i)(u.ROOT_ERROR_CALLBACK,l),void f({message:r.errors})):void new c[e]({channel:s,authorization:t,gatewayConfiguration:a,integrationType:e,merchantConfiguration:i,analyticsConfiguration:{sdkVersion:"braintree/web/"+o,merchantAppId:n.location.host},isMerchantPageHttps:p.isBrowserHttps()})})}var o="2.17.1",r=t(14),s=t(213),a=t(199),c=t(172),u=t(167),l=t(174),h=t(176),p=t(81),f=t(192);e.exports={api:r,data:f,cse:n.Braintree,paypal:s,dropin:a,hostedFields:{VERSION:t(207).VERSION},setup:i,VERSION:o}}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{14:14,167:167,172:172,174:174,176:176,192:192,199:199,207:207,213:213,81:81}],180:[function(t,e,n){"use strict";function i(t){var e=new o(t);return e.canCreateIntegration?e:null}var o=t(183);e.exports={create:i}},{183:183}],181:[function(t,e,n){(function(t){"use strict";function n(e){return e=e||t.navigator.userAgent,/AppleWebKit\//.test(e)&&/Mobile\//.test(e)?e.replace(/.* OS ([0-9_]+) like Mac OS X.*/,"$1").replace(/_/g,"."):null}function i(e){var n=e||t.navigator.userAgent,i=null,o=/MSIE.(\d+)/.exec(n);return/Trident/.test(n)&&(i=11),o&&(i=parseInt(o[1],10)),i}function o(e){return e=e||t.navigator.userAgent,/Android/.test(e)?e.replace(/^.* Android ([0-9\.]+).*$/,"$1"):null}e.exports={ieVersion:i,iOSSafariVersion:n,androidVersion:o}}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],182:[function(t,e,n){"use strict";function i(t,e,n){return t?(n.bus.emit(o.ERROR,t.error),void n.bus.emit(o.SEND_ANALYTICS_EVENTS,"coinbase.generate.nonce.failed")):(n.bus.emit(o.PAYMENT_METHOD_GENERATED,e),void n.bus.emit(o.SEND_ANALYTICS_EVENTS,"coinbase.generate.nonce.succeeded"))}var o=t(163).events;e.exports={tokenize:i}},{163:163}],183:[function(t,e,n){(function(n){"use strict";function i(t){return{clientId:t.gatewayConfiguration.coinbase.clientId,redirectUrl:t.gatewayConfiguration.coinbase.redirectUrl,scopes:t.gatewayConfiguration.coinbase.scopes||f.SCOPES,meta:{authorizations_merchant_account:t.gatewayConfiguration.coinbase.merchantAccount||""}}}function o(t){return function(e,n){t.emit(m.events.ERROR,{type:n,message:e})}}function r(t,e){var n=(t.merchantConfiguration||{}).coinbase,i=o(e);if(null==t.apiClient)i("apiClient is required for coinbase",f.CONFIGURATION_ERROR);else if(t.gatewayConfiguration.coinbaseEnabled)if(n&&(n.container||n.button))if(n.container&&n.button)i("options.coinbase.container and options.coinbase.button are mutually exclusive",f.CONFIGURATION_ERROR);else{if(d.isSupportedBrowser())return!0;i("Coinbase is not supported by your browser. Please consider upgrading",f.UNSUPPORTED_BROWSER_ERROR)}else i("Either options.coinbase.container or options.coinbase.button is required for Coinbase integrations",f.CONFIGURATION_ERROR);else i("Coinbase is not enabled for your merchant account",f.CONFIGURATION_ERROR);return!1}function s(t){var e,o,s=this;this.configuration=t,this.destructor=new u,o={channel:t.channel};try{t.coinbase.container&&(o.merchantUrl=n.location.href)}catch(l){}this.bus=t.bus||new m(o),this.canCreateIntegration=r(t,this.bus),this.canCreateIntegration&&(this.buttonId=t.merchantConfiguration.coinbase.button||f.BUTTON_ID,this.apiClient=t.apiClient||new y.Client(t),this._onOAuthSuccess=a(this._onOAuthSuccess,this),this._handleButtonClick=a(this._handleButtonClick,this),this.popupParams=i(t),this.redirectDoneInterval=null,t.merchantConfiguration.coinbase.container?(e=c.normalizeElement(t.merchantConfiguration.coinbase.container),this._insertFrame(e)):(n.braintreeCoinbasePopupCallback=this._onOAuthSuccess,e=document.body,c.addEventListener(e,"click",this._handleButtonClick),this.bus.emit(m.events.SEND_ANALYTICS_EVENTS,"coinbase.initialized"),this.destructor.registerFunctionForTeardown(function(){s._closePopup()}),this.bus.on(f.TEARDOWN_EVENT,a(this.destructor.teardown,this.destructor))))}var a=t(95),c=t(81),u=t(85),l=t(187),h=t(190),p=t(182),f=t(184),d=t(185),m=t(163),y=t(14);s.prototype._insertFrame=function(t){var e=this,n=l.createFrame({channel:this.configuration.channel});this.bus.emit(m.events.ASYNC_DEPENDENCY_INITIALIZING),t.appendChild(n),this.destructor.registerFunctionForTeardown(function(){t.removeChild(n)}),setTimeout(function(){n.src=e.configuration.gatewayConfiguration.assetsUrl+"/coinbase/"+f.VERSION+"/coinbase-frame.html#"+e.configuration.channel},0)},s.prototype._onOAuthSuccess=function(t){var e=this;return t.code?(this.bus.emit("coinbase:view:navigate","loading"),this.bus.emit(m.events.SEND_ANALYTICS_EVENTS,"coinbase.popup.authorized"),this.apiClient.tokenizeCoinbase({code:t.code,query:h.getQueryString()},function(t,n){p.tokenize.apply(null,[t,n,e])}),void this._closePopup()):(this.bus.emit(m.events.SEND_ANALYTICS_EVENTS,"coinbase.popup.denied"),void this._closePopup())},s.prototype._clearPollForRedirectDone=function(){this.redirectDoneInterval&&(clearInterval(this.redirectDoneInterval),this.redirectDoneInterval=null)},s.prototype._closePopup=function(t){t=t||this.popup,null!=t&&(d.shouldCloseFromParent()&&t.close(),this._popupCleanup())},s.prototype._popupCleanup=function(){this._clearPollForRedirectDone(),this.bus.emit(m.events.UI_POPUP_DID_CLOSE,{source:f.INTEGRATION_NAME})},s.prototype._pollForRedirectDone=function(t){var e=this,n=setInterval(function(){var n;if(null==t||t.closed)return e.bus.emit(m.events.SEND_ANALYTICS_EVENTS,"coinbase.popup.aborted"),void e._popupCleanup();try{if("about:blank"===t.location.href)throw new Error("Not finished loading");n=c.decodeQueryString(t.location.search.replace(/^\?/,"")).code}catch(i){return}e._onOAuthSuccess({code:n})},100);return this.redirectDoneInterval=n,n},s.prototype._openPopup=function(){var t;this.bus.emit(m.events.SEND_ANALYTICS_EVENTS,"coinbase.popup.started"),t=l.createPopup(h.compose(this._getOAuthBaseUrl(),this.popupParams)),t.focus(),this._pollForRedirectDone(t),this.bus.emit(m.events.UI_POPUP_DID_OPEN,{source:f.INTEGRATION_NAME}),this.bus.on(m.events.UI_POPUP_FORCE_CLOSE,function(e){e.target===f.INTEGRATION_NAME&&t.close()}),this.popup=t},s.prototype._getOAuthBaseUrl=function(){var t;return t="shared_sandbox"===this.configuration.gatewayConfiguration.coinbase.environment?f.SANDBOX_OAUTH_BASE_URL:f.PRODUCTION_OAUTH_BASE_URL},s.prototype._handleButtonClick=function(t){for(var e=t.target||t.srcElement;;){if(null==e)return;if(e===t.currentTarget)return;if(e.id===this.buttonId)break;e=e.parentNode}t&&t.preventDefault?t.preventDefault():t.returnValue=!1,this._openPopup()},s.prototype.teardown=function(t){var e=this;return this.canCreateIntegration?void this.bus.emit(f.TEARDOWN_EVENT,function(){e.destructor.teardown(function(n){return n?t(n):(e.bus.teardown(),void t(null))})}):void t(null)},e.exports=s}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{14:14,163:163,182:182,184:184,185:185,187:187,190:190,81:81,85:85,95:95}],184:[function(t,e,n){"use strict";e.exports={PRODUCTION_OAUTH_BASE_URL:"https://coinbase.com",SANDBOX_OAUTH_BASE_URL:"https://sandbox.coinbase.com",ORIGIN_URL:"https://www.coinbase.com",FRAME_NAME:"braintree-coinbase-frame",POPUP_NAME:"coinbase",BUTTON_ID:"bt-coinbase-button",SCOPES:"send",VERSION:"2.17.1",INTEGRATION_NAME:"Coinbase",CONFIGURATION_ERROR:"CONFIGURATION",UNSUPPORTED_BROWSER_ERROR:"UNSUPPORTED_BROWSER",TEARDOWN_EVENT:"coinbase:TEARDOWN"}},{}],185:[function(t,e,n){"use strict";function i(){var t=a.ieVersion();return!t||t>8}function o(){var t=a.androidVersion();return null==t?!1:/^5/.test(t)}function r(){return!(o()||s())}function s(){var t=a.iOSSafariVersion();return null==t?!1:/^8\.0/.test(t)||/^8\.1$/.test(t)}var a=t(181);e.exports={isSupportedBrowser:i,shouldCloseFromParent:r,shouldDisplayIOSClose:s,shouldDisplayLollipopClose:o}},{181:181}],186:[function(t,e,n){"use strict";function i(t){var e=document.createElement("button");return t=t||{},e.id=t.id||"coinbase-button",e.style.backgroundColor=t.backgroundColor||"#EEE",e.style.color=t.color||"#4597C3",e.style.border=t.border||"0",e.style.borderRadius=t.borderRadius||"6px",e.style.padding=t.padding||"12px",e.innerHTML=t.innerHTML||"coinbase",e}e.exports={create:i}},{}],187:[function(t,e,n){"use strict";var i=t(189),o=t(186),r=t(188);e.exports={createButton:o.create,createPopup:i.create,createFrame:r.create}},{186:186,188:188,189:189}],188:[function(t,e,n){"use strict";function i(){return r({name:o.FRAME_NAME,height:"70px",width:"100%",style:{padding:0,margin:0,border:0,outline:"none"}})}var o=t(184),r=t(90);e.exports={create:i}},{184:184,90:90}],189:[function(t,e,n){(function(n){"use strict";function i(t){var e,n=[];for(e in t)t.hasOwnProperty(e)&&n.push([e,t[e]].join("="));return n.join(",")}function o(){var t=580,e=810;return i({width:t,height:e,left:(screen.width-t)/2,top:(screen.height-e)/4})}function r(t){return n.open(t,s.POPUP_NAME,o())}var s=t(184);e.exports={create:r}}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{184:184}],190:[function(t,e,n){"use strict";function i(){return"version="+r.VERSION}function o(t,e){var n,o=t+"/oauth/authorize?response_type=code",r=e.redirectUrl+"?"+i();if(o+="&redirect_uri="+encodeURIComponent(r),o+="&client_id="+e.clientId,e.scopes&&(o+="&scope="+encodeURIComponent(e.scopes)),e.meta)for(n in e.meta)e.meta.hasOwnProperty(n)&&(o+="&meta["+encodeURIComponent(n)+"]="+encodeURIComponent(e.meta[n]));return o}var r=t(184);e.exports={compose:o,getQueryString:i}},{184:184}],191:[function(t,e,n){"use strict";function i(){return new o}function o(){this.sessionId=r(),this._beaconId=s(this.sessionId),this._parameterBlock=a(this.sessionId,this._beaconId),this._thirdPartyBlock=c()}function r(){var t,e="";for(t=0;32>t;t++)e+=Math.floor(16*Math.random()).toString(16);return e}function s(t){var e=(new Date).getTime()/1e3;return"https://b.stats.paypal.com/counter.cgi?i=127.0.0.1&p="+t+"&t="+e+"&a=14"}function a(t,e){var n=document.body.appendChild(document.createElement("script"));return n.type="application/json",n.setAttribute("fncls","fnparams-dede7cc5-15fd-4c75-a9f4-36c430ee3a99"),n.text=JSON.stringify({f:t,s:"BRAINTREE_SIGNIN",b:e}),n}function c(){function t(){n._l()}var e,n,i="https://www.paypalobjects.com/webstatic/r/fb/",o=document.createElement("iframe");o.src="about:blank",o.title="",o.role="presentation",(o.frameElement||o).style.cssText="width: 0; height: 0; border: 0",document.body.appendChild(o);try{n=o.contentWindow.document}catch(r){e=document.domain,o.src='javascript:var d=document.open();d.domain="'+e+'";void(0);',n=o.contentWindow.document}return n.open()._l=function(){var t=this.createElement("script");e&&(this.domain=e),t.id="js-iframe-async",t.src=i+"fb-all-prod.pp.min.js",this.body.appendChild(t)},o.addEventListener?o.addEventListener("load",t,!1):o.attachEvent?o.attachEvent("onload",t):n.write('<body onload="document._l();">'),n.close(),o}o.prototype.teardown=function(){this._thirdPartyBlock.parentNode.removeChild(this._thirdPartyBlock)},e.exports={setup:i}},{}],192:[function(t,e,n){"use strict";function i(t){function e(){var t;for(t=0;t<a.length;t++)a[t].teardown()}var n,i,s,a=[];return null!=t.kount?(i=o.setup(t.kount),n=i.deviceData,a.push(i)):n={},t.paypal===!0&&(s=r.setup(),n.correlation_id=s.sessionId,a.push(s)),{deviceData:JSON.stringify(n),teardown:e}}var o=t(193),r=t(191);e.exports={setup:i}},{191:191,193:193}],193:[function(t,e,n){(function(t){"use strict";function n(t){var e=null!=t?t:{};return new i(e)}function i(t){o.random.startCollectors(),this._currentEnvironment=this._initializeEnvironment(t),this._deviceSessionId=this._generateDeviceSessionId(),this.deviceData=this._getDeviceData(),this._iframe=this._setupIFrame()}var o=t.Braintree.sjcl,r="braintreeDataFrame",s="600000",a={qa:"https://assets.qa.braintreepayments.com/data",sandbox:"https://assets.braintreegateway.com/sandbox/data",production:"https://assets.braintreegateway.com/data"};i.prototype.teardown=function(){o.random.stopCollectors(),this._removeIframe()},i.prototype._removeIframe=function(){this._iframe.parentNode.removeChild(this._iframe)},i.prototype._getDeviceData=function(){return{device_session_id:this._deviceSessionId,fraud_merchant_id:this._currentEnvironment.id}},i.prototype._generateDeviceSessionId=function(){var t,e;return t=o.random.randomWords(4,0),e=o.codec.hex.fromBits(t)},i.prototype._setupIFrame=function(){var t,e=this,n=document.getElementById(r);return null!=n?n:(t="?m="+this._currentEnvironment.id+"&s="+this._deviceSessionId,n=document.createElement("iframe"),n.width=1,n.id=r,n.height=1,n.frameBorder=0,n.scrolling="no",document.body.appendChild(n),setTimeout(function(){n.src=e._currentEnvironment.url+"/logo.htm"+t,n.innerHTML='<img src="'+e._currentEnvironment.url+"/logo.gif"+t+'" />'},10),n)},i.prototype._initializeEnvironment=function(t){var e=a[t.environment];if(null==e)throw new Error(t.environment+" is not a valid environment for kount.environment");return{url:e,name:t.environment,id:null==t.merchantId?s:t.merchantId}},e.exports={setup:n,Kount:i,environmentUrls:a}}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],194:[function(t,e,n){"use strict";function i(t){this.apiClient=t}var o=["unlockCreditCard"];i.prototype.attach=function(t){function e(e){t.define(e,function(){n.apiClient[e].apply(n.apiClient,arguments)})}var n=this,i=0,r=o.length;for(i;r>i;i++)e(o[i])},e.exports=i},{}],195:[function(t,e,n){(function(n){"use strict";function i(t,e){var n=window.getComputedStyle?getComputedStyle(t):t.currentStyle;return n[e]}function o(){return{html:{height:a.style.height||"",overflow:i(a,"overflow"),position:i(a,"position")},body:{height:c.style.height||"",overflow:i(c,"overflow")}}}function r(){var t=/Android|iPhone|iPod|iPad/i.test(window.navigator.userAgent);return t}function s(t){var e,i,o,r=this;this.configuration=t,this.destructor=new h,this.container=null,this.merchantFormManager=null,this.configurationRequests=[],this.braintreeApiClient=new u.Client(this.configuration),this.braintreeBus=new l({merchantUrl:n.location.href,channel:this.configuration.channel}),this.bus=new p.MessageBus(this.configuration.root,this.configuration.channel),this.rpcServer=new p.RPCServer(this.bus),this.apiProxyServer=new y(this.braintreeApiClient),this.apiProxyServer.attach(this.rpcServer),e=this.configuration.inlineFramePath||this.configuration.gatewayConfiguration.assetsUrl+"/dropin/"+b+"/inline-frame.html",i=this.configuration.modalFramePath||this.configuration.gatewayConfiguration.assetsUrl+"/dropin/"+b+"/modal-frame.html",a=document.documentElement,c=document.body,this.frames={inline:this._createFrame(e,_.INLINE_FRAME_NAME),modal:this._createFrame(i,_.MODAL_FRAME_NAME)},this.container=d(this.configuration.merchantConfiguration.container,"Unable to find valid container."),o=d(this.configuration.merchantConfiguration.form||this._findClosest(this.container,"form")),this.merchantFormManager=new g({form:o,frames:this.frames,onSubmit:this.configuration.merchantConfiguration.paymentMethodNonceReceived,apiClient:this.braintreeApiClient}).initialize(),this.destructor.registerFunctionForTeardown(function(){r.merchantFormManager.teardown()}),this.configuration.gatewayConfiguration.paypalEnabled&&this._configurePayPal(),this.braintreeApiClient.sendAnalyticsEvents("dropin.web.initialized")}var a,c,u=t(14),l=t(163),h=t(85),p=t(63),f=t(81),d=f.normalizeElement,m=t(95),y=t(194),g=t(198),v=t(197),_=t(200),b="2.17.1",E=t(217);s.prototype.initialize=function(){var t,e=this;this._initializeModal(),this.braintreeBus.emit(l.events.ASYNC_DEPENDENCY_INITIALIZING),this.container.appendChild(this.frames.inline.element),c.appendChild(this.frames.modal.element),this.destructor.registerFunctionForTeardown(function(t){e._hideModal(function(){e.container.removeChild(e.frames.inline.element),c.removeChild(e.frames.modal.element),t()})}),this.rpcServer.define("receiveSharedCustomerIdentifier",function(n){for(e.braintreeApiClient.attrs.sharedCustomerIdentifier=n,e.braintreeApiClient.attrs.sharedCustomerIdentifierType="browser_session_cookie_store",t=0;t<e.configurationRequests.length;t++)e.configurationRequests[t](e.encodedClientToken);e.configurationRequests=[]}),this.braintreeBus.on(l.events.PAYMENT_METHOD_GENERATED,m(this._handleAltPayData,this)),this.rpcServer.define("getConfiguration",function(t){t(e.configuration)}),this.rpcServer.define("selectPaymentMethod",function(t){e.frames.modal.rpcClient.invoke("selectPaymentMethod",[t]),e._showModal()}),this.rpcServer.define("sendAddedPaymentMethod",function(t){
e.merchantFormManager.setNoncePayload(t),e.frames.inline.rpcClient.invoke("receiveNewPaymentMethod",[t])}),this.rpcServer.define("sendUsedPaymentMethod",function(t){e.frames.inline.rpcClient.invoke("selectPaymentMethod",[t])}),this.rpcServer.define("sendUnlockedNonce",function(t){e.merchantFormManager.setNoncePayload(t)}),this.rpcServer.define("clearNonce",function(){e.merchantFormManager.clearNoncePayload()}),this.rpcServer.define("closeDropInModal",function(){e._hideModal()}),this.rpcServer.define("setInlineFrameHeight",function(t){e.frames.inline.element.style.height=t+"px"}),this.bus.register("ready",function(t){t.source===e.frames.inline.element.contentWindow?e.frames.inline.rpcClient=new p.RPCClient(e.bus,t.source):t.source===e.frames.modal.element.contentWindow&&(e.frames.modal.rpcClient=new p.RPCClient(e.bus,t.source))})},s.prototype._createFrame=function(t,e){return new v(t,e,this.braintreeBus)},s.prototype._initializeModal=function(){this.frames.modal.element.style.display="none",this.frames.modal.element.style.position=r()?"absolute":"fixed",this.frames.modal.element.style.top="0",this.frames.modal.element.style.left="0",this.frames.modal.element.style.height="100%",this.frames.modal.element.style.width="100%"},s.prototype._lockMerchantWindowSize=function(){setTimeout(function(){a.style.overflow="hidden",c.style.overflow="hidden",c.style.height="100%",r()&&(a.style.position="relative",a.style.height=window.innerHeight+"px")},160)},s.prototype._unlockMerchantWindowSize=function(){var t=this.merchantPageDefaultStyles;t&&(c.style.height=t.body.height,c.style.overflow=t.body.overflow,a.style.overflow=t.html.overflow,r()&&(a.style.height=t.html.height,a.style.position=t.html.position),delete this.merchantPageDefaultStyles)},s.prototype._showModal=function(){var t=this,e=this.frames.modal.element;this.merchantPageDefaultStyles=o(),e.style.display="block",this.frames.modal.rpcClient.invoke("open",[],function(){setTimeout(function(){t._lockMerchantWindowSize(),e.contentWindow.focus()},200)})},s.prototype._hideModal=function(t){this._unlockMerchantWindowSize(),this.frames.modal.element.style.display="none",t&&t()},s.prototype._configurePayPal=function(){var t=this.configuration.merchantConfiguration.paypal||{};this.paypalModalView=new E({channel:this.configuration.channel,insertFrameFunction:t.insertFrame,paypalAssetsUrl:this.configuration.gatewayConfiguration.paypal.assetsUrl,isHermes:Boolean(t.singleUse)&&Boolean(t.amount)&&Boolean(t.currency)})},s.prototype._handleAltPayData=function(t){this.merchantFormManager.setNoncePayload(t),this.frames.inline.rpcClient.invoke("receiveNewPaymentMethod",[t]),this.frames.modal.rpcClient.invoke("modalViewClose")},s.prototype._findClosest=function(t,e){e=e.toUpperCase();do{if(t.nodeName===e)return t;t=t.parentNode}while(t);throw new Error("Unable to find a valid "+e)},s.prototype.teardown=function(t){var e=this;this.paypalModalView&&this.paypalModalView.teardown(),this.braintreeBus.emit(_.MODAL_FRAME_TEARDOWN_EVENT,function(){e.braintreeBus.emit(_.INLINE_FRAME_TEARDOWN_EVENT,function(){e.destructor.teardown(function(n){return n?t(n):(e.braintreeBus.teardown(),void t())})})})},e.exports=s}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{14:14,163:163,194:194,197:197,198:198,200:200,217:217,63:63,81:81,85:85,95:95}],196:[function(t,e,n){"use strict";function i(t){var e=new o(t);return e.initialize(),e}var o=t(195),r="2.17.1";e.exports={create:i,VERSION:r}},{195:195}],197:[function(t,e,n){"use strict";function i(){var t,e=document.createElement("fakeelement");for(t in u)if("undefined"!=typeof e.style[t])return u[t];return null}function o(t,e){function n(i){i.target===t&&"height"===i.propertyName&&(e.emit(s.events.ASYNC_DEPENDENCY_READY),t.removeEventListener(o,n))}var o=i();o?t.addEventListener(o,n):setTimeout(function(){e.emit(s.events.ASYNC_DEPENDENCY_READY)},500)}function r(t,e,n){var i="height 210ms cubic-bezier(0.390, 0.575, 0.565, 1.000)",r=c({name:e,width:"100%",height:"68",style:{transition:i,WebkitTransition:i,MozTransition:i,msTransition:i,OTransition:i,border:"0",zIndex:"9999"}});this.element=r,setTimeout(function(){r.src=t+"#"+n.channel},0),e===a.INLINE_FRAME_NAME&&o(r,n)}var s=t(163),a=t(200),c=t(90),u={transition:"transitionend","-o-transition":"otransitionEnd","-moz-transition":"transitionend","-webkit-transition":"webkitTransitionEnd"};e.exports=r},{163:163,200:200,90:90}],198:[function(t,e,n){"use strict";function i(t){this.formNapper=new r(t.form),this.frames=t.frames,this.onSubmit=t.onSubmit,this.apiClient=t.apiClient}var o=t(95),r=t(88);i.prototype.initialize=function(){return this._isSubmitBased()&&this._setElements(),this._setEvents(),this},i.prototype.setNoncePayload=function(t){this.noncePayload=t},i.prototype.clearNoncePayload=function(){this.noncePayload=null},i.prototype._isSubmitBased=function(){return!this.onSubmit},i.prototype._isCallbackBased=function(){return Boolean(this.onSubmit)},i.prototype._setElements=function(){this.nonceInput=this.formNapper.inject("payment_method_nonce","")},i.prototype._setEvents=function(){this.formNapper.hijack(o(this._handleFormSubmit,this))},i.prototype._handleFormSubmit=function(t){var e=this;this.noncePayload&&this.noncePayload.nonce?this._handleNonceReply(t):this.frames.inline.rpcClient.invoke("requestNonce",[],function(n){e.setNoncePayload(n),e._handleNonceReply(t)})},i.prototype._handleNonceReply=function(t){var e=this;this._isCallbackBased()?this.apiClient.sendAnalyticsEvents("dropin.web.end.callback",function(){var n=e.noncePayload;n.originalEvent=t,e.onSubmit(n),setTimeout(function(){delete n.originalEvent,e.frames.inline.rpcClient.invoke("clearLoadingState"),e.frames.inline.rpcClient.invoke("receiveNewPaymentMethod",[n])},200)}):this._triggerFormSubmission()},i.prototype._triggerFormSubmission=function(){var t=this;this.nonceInput=this.formNapper.inject("payment_method_nonce",this.noncePayload.nonce),this.apiClient.sendAnalyticsEvents("dropin.web.end.auto-submit",function(){t.formNapper.submit()})},i.prototype.teardown=function(){var t;this.nonceInput&&(t=this.formNapper.htmlForm,t.removeChild(this.nonceInput)),this.formNapper.detach()},e.exports=i},{88:88,95:95}],199:[function(t,e,n){"use strict";e.exports=t(196)},{196:196}],200:[function(t,e,n){e.exports={PAYPAL_INTEGRATION_NAME:"PayPal",INLINE_FRAME_NAME:"braintree-dropin-frame",MODAL_FRAME_NAME:"braintree-dropin-modal-frame",PAYMENT_METHOD_TYPES:["CoinbaseAccount","PayPalAccount","CreditCard"],cssClassMap:{"American Express":"american-express","Diners Club":"diners-club",DinersClub:"diners-club",Discover:"discover",JCB:"jcb",Maestro:"maestro",MasterCard:"master-card",Solo:"solo",Switch:"switch",UKMaestro:"maestro",UnionPay:"unionpay",Visa:"visa"},INLINE_FRAME_TEARDOWN_EVENT:"dropin:TEARDOWN_INLINE_FRAME",MODAL_FRAME_TEARDOWN_EVENT:"dropin:TEARDOWN_MODAL_FRAME"}},{}],201:[function(t,e,n){"use strict";function i(t,e){var n=e.merchantConfiguration||{},i=document.getElementById(n.id),s=n.useCreditCard!==!1;if(!i)throw new Error('Unable to find form with id: "'+n.id+'"');return s&&r(i),new o(t,e)}var o=t(203),r=t(206);e.exports={setup:i}},{203:203,206:206}],202:[function(t,e,n){(function(t){"use strict";function n(t,e){var o,s,a,c=t.children;for(e=e||{},s=0;s<c.length;s++)o=c[s],r(o)?(a=o.getAttribute("data-braintree-name"),"postal_code"===a?e.billingAddress={postalCode:o.value}:e[a]=o.value,i(o)):o.children&&o.children.length>0&&n(o,e);return e}function i(t){try{t.attributes.removeNamedItem("name")}catch(e){}}function o(t){n(t)}function r(t){return t.nodeType===s&&t.attributes["data-braintree-name"]}var s=t.Node?t.Node.ELEMENT_NODE:1;e.exports={extractValues:n,scrubAllAttributes:o,scrubAttributes:i,isBraintreeNode:r}}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],203:[function(t,e,n){(function(n){"use strict";function i(t,e){var i=e.merchantConfiguration,o="object"==typeof i.paymentMethodNonceInputField,r=this;this.destructor=new a,this.apiClient=t,this.isCreditCardForm=i.useCreditCard!==!1,this.htmlForm=document.getElementById(i.id),this.paymentMethodNonceInput=l(i.paymentMethodNonceInputField),this.htmlForm.appendChild(this.paymentMethodNonceInput),this.destructor.registerFunctionForTeardown(function(){o?r.paymentMethodNonceInput.value="":r.htmlForm.removeChild(r.paymentMethodNonceInput)}),this.model=new u,this.bus=new c({merchantUrl:n.location.href,channel:e.channel}),this.setEvents(),this.destructor.registerFunctionForTeardown(function(){r.bus.teardown()})}var o=t(95),r=t(81),s=t(202),a=t(85),c=t(163),u=t(205),l=t(204),h={message:"Unable to process payments at this time",type:"IMMEDIATE"};i.prototype.setEvents=function(){var t=this;this.onSubmitHandler=o(this.handleSubmit,this),this.onExternalNonceReceived=o(this.onExternalNonceReceived,this),this.clearExternalNonce=o(this.clearExternalNonce,this),r.addEventListener(this.htmlForm,"submit",this.onSubmitHandler),this.destructor.registerFunctionForTeardown(function(){r.removeEventListener(t.htmlForm,"submit",t.onSubmitHandler)}),this.bus.on(c.events.PAYMENT_METHOD_GENERATED,this.onExternalNonceReceived),this.bus.on(c.events.PAYMENT_METHOD_CANCELLED,this.clearExternalNonce)},i.prototype.handleSubmit=function(t){var e,n=this;return t.preventDefault?t.preventDefault():t.returnValue=!1,this.isCreditCardForm?(e=this.model.get("type"),e&&"CreditCard"!==e?(s.scrubAllAttributes(this.htmlForm),void this.onNonceReceived(null,this.model.attributes)):void this.apiClient.tokenizeCard(s.extractValues(this.htmlForm),function(t,e,i){t?n.onNonceReceived(h,null):(n.model.set({nonce:e,type:i.type,details:i.details}),n.onNonceReceived(null,n.model.attributes))})):void this.onNonceReceived(null,this.model.attributes)},i.prototype.writeNonceToDOM=function(){this.paymentMethodNonceInput.value=this.model.get("nonce")},i.prototype.onExternalNonceReceived=function(t){this.model.set(t),this.writeNonceToDOM()},i.prototype.clearExternalNonce=function(){this.model.reset()},i.prototype.onNonceReceived=function(t){var e=this.htmlForm;return t?void this.bus.emit(c.events.ERROR,h):(r.removeEventListener(e,"submit",this.onSubmitHandler),this.writeNonceToDOM(),void(e.submit&&("function"==typeof e.submit||e.submit.call)?e.submit():setTimeout(function(){e.querySelector('[type="submit"]').click()},1)))},i.prototype.teardown=function(){this.destructor.teardown()},e.exports=i}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{163:163,202:202,204:204,205:205,81:81,85:85,95:95}],204:[function(t,e,n){"use strict";e.exports=function(t){var e,n;return"object"==typeof t?t:(e="payment_method_nonce","string"==typeof t&&(e=t),n=document.createElement("input"),n.name=e,n.type="hidden",n)}},{}],205:[function(t,e,n){"use strict";function i(){this.reset()}i.prototype.get=function(t){return this.attributes[t]},i.prototype.set=function(t){this.attributes=t||{}},i.prototype.reset=function(){this.attributes={}},e.exports=i},{}],206:[function(t,e,n){"use strict";e.exports=function(t){var e,n,i=t.getElementsByTagName("*"),o={};for(e=0;e<i.length;e++)n=i[e].getAttribute("data-braintree-name"),o[n]=!0;if(!o.number)throw new Error('Unable to find an input with data-braintree-name="number" in your form. Please add one.');if(o.expiration_date){if(o.expiration_month||o.expiration_year)throw new Error('You have inputs with data-braintree-name="expiration_date" AND data-braintree-name="expiration_(year|month)". Please use either "expiration_date" or "expiration_year" and "expiration_month".')}else{if(!o.expiration_month&&!o.expiration_year)throw new Error('Unable to find an input with data-braintree-name="expiration_date" in your form. Please add one.');if(!o.expiration_month)throw new Error('Unable to find an input with data-braintree-name="expiration_month" in your form. Please add one.');if(!o.expiration_year)throw new Error('Unable to find an input with data-braintree-name="expiration_year" in your form. Please add one.')}}},{}],207:[function(t,e,n){"use strict";var i=t(209),o=t(211).events,r="2.17.1";e.exports={create:function(t){return new i(t)},events:o,VERSION:r}},{209:209,211:211}],208:[function(t,e,n){"use strict";var i=t(211);e.exports=function(t,e){return t+"/hosted-fields/"+i.VERSION+"/hosted-fields-frame.html#"+e}},{211:211}],209:[function(t,e,n){"use strict";function i(t,e){var n=document.createElement("div");return n.style.clear="both",e=e||document.body,e.appendChild(t),e.appendChild(n),{parent:e,children:[t,n]}}function o(t,e){return function(n){var i=t[n.fieldKey].containerElement,o=a(i);n.target={fieldKey:n.fieldKey,container:i},o.toggle(h.externalClasses.FOCUSED,n.isFocused).toggle(h.externalClasses.VALID,n.isValid),n.isStrictlyValidating?o.toggle(h.externalClasses.INVALID,!n.isValid):o.toggle(h.externalClasses.INVALID,!n.isPotentiallyValid),delete n.fieldKey,delete n.isStrictlyValidating,e&&e(n)}}function r(t){var e,n,r,p,f,d=this,m={},g=0;this.injectedNodes=[],this.destructor=new s,this.bus=new u({channel:t.channel,merchantUrl:location.href}),this.destructor.registerFunctionForTeardown(function(){d.bus.teardown()}),this.bus.emit(u.events.ASYNC_DEPENDENCY_INITIALIZING),this.bus.emit(u.events.SEND_ANALYTICS_EVENTS,"hosted-fields.initialized");for(p in h.whitelistedFields)if(h.whitelistedFields.hasOwnProperty(p)){if(e=t.merchantConfiguration.hostedFields[p],!e)continue;if(n=document.querySelector(e.selector),!n){f='Unable to find element with selector "'+e.selector+'" for hostedFields.'+p,this.bus.emit(u.events.ERROR,{message:f});continue}if(n.querySelector('iframe[name^="braintree-"]')){this.bus.emit(u.events.ERROR,{message:'Cannot place two elements in "'+e.selector+'"'});continue}r=c({type:p,name:"braintree-hosted-field-"+p,style:h.defaultIFrameStyle}),this.injectedNodes.push(i(r,n)),this.setupLabelFocus(p,n),m[p]={frameElement:r,containerElement:n},g++,setTimeout(function(e){return function(){e.src=l(t.gatewayConfiguration.assetsUrl,t.channel)}}(r),0)}this.bus.on(y.FRAME_READY,function(t){g--,t(0===g?!0:!1)}),this.bus.on(y.INPUT_EVENT,o(m,t.merchantConfiguration.hostedFields.onFieldEvent)),this.destructor.registerFunctionForTeardown(function(){var t,e,n;for(t=0;t<d.injectedNodes.length;t++){for(n=d.injectedNodes[t],e=0;e<n.children.length;e++)n.parent.removeChild(n.children[e]);a(n.parent).remove(h.externalClasses.FOCUSED,h.externalClasses.INVALID,h.externalClasses.VALID)}})}var s=t(85),a=t(82),c=t(90),u=t(163),l=t(208),h=t(211),p=t(162),f=t(81),d=t(212),m=t(210),y=h.events;r.prototype.setupLabelFocus=function(t,e){function n(){r.emit(y.TRIGGER_INPUT_FOCUS,t)}var i,o,r=this.bus;if(m()&&null!=e.id){for(i=p(document.querySelectorAll('label[for="'+e.id+'"]')),i=i.concat(d(e,"label")),o=0;o<i.length;o++)f.addEventListener(i[o],"click",n,!1);this.destructor.registerFunctionForTeardown(function(){for(o=0;o<i.length;o++)f.removeEventListener(i[o],"click",n,!1)})}},r.prototype.teardown=function(t){this.destructor.teardown(t)},e.exports=r},{162:162,163:163,208:208,210:210,211:211,212:212,81:81,82:82,85:85,90:90}],210:[function(t,e,n){"use strict";e.exports=function(){return!/(iPad|iPhone|iPod)/i.test(navigator.userAgent)}},{}],211:[function(t,e,n){"use strict";var i="2.17.1";e.exports={VERSION:i,events:{FRAME_READY:"hosted-fields:FRAME_READY",VALIDATE_STRICT:"hosted-fields:VALIDATE_STRICT",CONFIGURATION:"hosted-fields:CONFIGURATION",TOKENIZATION_REQUEST:"hosted-fields:TOKENIZATION_REQUEST",INPUT_EVENT:"hosted-fields:INPUT_EVENT",TRIGGER_INPUT_FOCUS:"hosted-fields:TRIGGER_INPUT_FOCUS"},externalEvents:{FOCUS:"focus",BLUR:"blur",FIELD_STATE_CHANGE:"fieldStateChange"},defaultMaxLengths:{number:19,postalCode:8,expirationDate:7,expirationMonth:2,expirationYear:4,cvv:3},externalClasses:{FOCUSED:"braintree-hosted-fields-focused",INVALID:"braintree-hosted-fields-invalid",VALID:"braintree-hosted-fields-valid"},defaultIFrameStyle:{border:"none",width:"100%",height:"100%","float":"left"},whitelistedStyles:["-moz-osx-font-smoothing","-moz-transition","-webkit-font-smoothing","-webkit-transition","color","font","font-family","font-size","font-size-adjust","font-stretch","font-style","font-variant","font-variant-alternates","font-variant-caps","font-variant-east-asian","font-variant-ligatures","font-variant-numeric","font-weight","line-height","opacity","outline","text-shadow","transition"],whitelistedFields:{number:{name:"credit-card-number",label:"Credit Card Number"},cvv:{name:"cvv",label:"CVV"},expirationDate:{name:"expiration",label:"Expiration Date"},expirationMonth:{name:"expiration-month",label:"Expiration Month"},expirationYear:{name:"expiration-year",label:"Expiration Year"},postalCode:{name:"postal-code",label:"Postal Code"}}}},{}],212:[function(t,e,n){"use strict";function i(t,e){for(var n=t.parentNode,i=[];null!=n;)null!=n.tagName&&n.tagName.toLowerCase()===e&&i.push(n),n=n.parentNode;return i}e.exports=i},{}],213:[function(t,e,n){"use strict";e.exports=t(215)},{215:215}],214:[function(t,e,n){(function(n){"use strict";function i(t){this.configuration=t,this.destructor=new a,this.bus=new c({merchantUrl:n.location.href,channel:this.configuration.channel}),this.container=o.normalizeElement(this.configuration.merchantConfiguration.paypal.container||document.body),this.loggedInView=null,this.loggedOutView=null,this.appView=null,this.merchantPageView=null,this.paymentMethodNonceInputFieldView=null,this.overlayView=null,this.bridgeIframeView=null,_(this,["initAuthFlow","closeAuthFlow"])}var o=t(81),r=t(95),s=t(151),a=t(85),c=t(163),u=t(217),l=t(219),h=t(220),p=t(223),f=t(221),d=t(224),m=t(218),y=t(234),g=t(226),v=t(236),_=t(96);i.prototype.initialize=function(){var t=r(this._handleClickLogin,this);this._createViews(),this.bus.on(c.events.PAYMENT_METHOD_CANCELLED,r(this._handlePaymentMethodCancelled,this)),"dropin"!==this.configuration.integrationType&&this.bus.on(c.events.PAYMENT_METHOD_GENERATED,r(this._handlePaymentMethodGenerated,this)),o.addEventListener(document.body,"click",t),this.destructor.registerFunctionForTeardown(function(){o.removeEventListener(document.body,"click",t)})},i.prototype._createViews=function(){var t,e=[],n=this,i="dropin"===this.configuration.integrationType;y.isBridgeIframeRequired()&&(this.bridgeIframeView=new m({container:this.container,paypalAssetsUrl:this.configuration.gatewayConfiguration.paypal.assetsUrl,channel:this.configuration.channel}),e.push(this.bridgeIframeView)),this.appView=new u({insertFrameFunction:this.configuration.merchantConfiguration.paypal.insertFrameFunction,paypalAssetsUrl:this.configuration.gatewayConfiguration.paypal.assetsUrl,isHermes:v.isHermesConfiguration(this.configuration),isDropin:i,channel:this.configuration.channel}),e.push(this.appView),i||(this.merchantPageView=new f({channel:this.configuration.channel}),e.push(this.merchantPageView),y.isPopupSupported()&&y.isOverlaySupported()&&(this.overlayView=new p({paypalAssetsUrl:this.configuration.gatewayConfiguration.paypal.assetsUrl,onFocus:function(){n.bus.emit(g.events.FOCUS_APP)},onClose:function(){n.bus.emit(g.events.CLOSE_APP)},locale:this.configuration.merchantConfiguration.paypal.locale,channel:this.configuration.channel}),e.push(this.overlayView))),i||this.configuration.merchantConfiguration.paypal.headless||(this.paymentMethodNonceInputFieldView=new d({container:this.container,el:this.configuration.merchantConfiguration.paypal.paymentMethodNonceInputField,channel:this.configuration.channel}),e.push(this.paymentMethodNonceInputFieldView),this.loggedInView=new l({paypalAssetsUrl:this.configuration.gatewayConfiguration.paypal.assetsUrl,container:this.container,locale:this.configuration.merchantConfiguration.paypal.locale,channel:this.configuration.channel}),e.push(this.loggedInView),this.loggedOutView=new h({paypalAssetsUrl:this.configuration.gatewayConfiguration.paypal.assetsUrl,container:this.container,enablePayPalButton:v.isOnetimeHermesConfiguration(this.configuration),locale:this.configuration.merchantConfiguration.paypal.locale,channel:this.configuration.channel}),e.push(this.loggedOutView)),this.destructor.registerFunctionForTeardown(function(){for(t=0;t<e.length;t++)e[t].teardown()})},i.prototype._handleClickLogin=function(t){for(var e=t.target||t.srcElement;;){if(null==e)return;if(e===t.currentTarget)return;if(this._isButton(e))break;e=e.parentNode}v.preventDefault(t),this.initAuthFlow()},i.prototype.initAuthFlow=function(){this.appView.open()},i.prototype.closeAuthFlow=function(){this.appView.close()},i.prototype._isButton=function(t){var e="braintree-paypal-button"===t.id,n=v.isOnetimeHermesConfiguration(this.configuration)&&t.className.match(/paypal-button(?!-widget)/);return e||n},i.prototype._handlePaymentMethodGenerated=function(t){var e=this.configuration.merchantConfiguration.paypal.onSuccess;t.type===g.NONCE_TYPE&&s(e)&&e(t)},i.prototype._handlePaymentMethodCancelled=function(t){var e=this.configuration.merchantConfiguration.paypal.onCancelled;t.source===g.PAYPAL_INTEGRATION_NAME&&s(e)&&e()},i.prototype.teardown=function(){var t=this;this.destructor.teardown(function(){t.bus.teardown()})},e.exports=i}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{151:151,163:163,217:217,218:218,219:219,220:220,221:221,223:223,224:224,226:226,234:234,236:236,81:81,85:85,95:95,96:96}],215:[function(t,e,n){"use strict";function i(t){var e,n;if(n=t.merchantConfiguration.onUnsupported,"function"!=typeof n&&(n=function(t){try{console.log(t)}catch(e){}}),!t.gatewayConfiguration.paypalEnabled)return n(new Error("PayPal is not enabled")),null;if(!h.detectedPostMessage())return n(new Error("unsupported browser detected")),null;if(!t.merchantConfiguration.paypal.container&&!t.merchantConfiguration.paypal.headless)return n(new Error("Please supply a container for the PayPal button to be appended to")),null;if(!u(t))return n(new Error("unsupported protocol detected")),null;if(c(t))return n(new Error("Unvetted merchant client token does not include a payee email")),null;if(d.isHermesConfiguration(t)&&!s(t.merchantConfiguration.paypal.locale))return n(new Error("This PayPal integration does not support this country")),null;if(d.isOnetimeHermesConfiguration(t)){if(!r(t.merchantConfiguration.paypal.currency))return n(new Error("This PayPal integration does not support this currency")),null;if(!a(t.merchantConfiguration.paypal.amount))return n(new Error("Amount must be a number")),null}return e=new l(t),e.initialize(),e}function o(t,e){var n,i=e.length,o=!1;for(n=0;i>n;n++)t.toLowerCase()===e[n].toLowerCase()&&(o=!0);return o}function r(t){return o(t,p.HERMES_SUPPORTED_CURRENCIES)}function s(t){return o(f(t).split("_")[1],p.HERMES_SUPPORTED_COUNTRIES)}function a(t){return t=parseFloat(t),"number"==typeof t&&!isNaN(t)&&t>=0}function c(t){return t.gatewayConfiguration.paypal.unvettedMerchant&&(!d.isHermesConfiguration(t)||!t.gatewayConfiguration.paypal.payeeEmail)}function u(t){return t.gatewayConfiguration.paypal.allowHttp?!0:h.isPopupSupported()?!0:"isMerchantPageHttps"in t?t.isMerchantPageHttps:y.isBrowserHttps()}var l=t(214),h=t(234),p=t(226),f=t(228),d=t(236),m="2.17.1",y=t(81);e.exports={create:i,VERSION:m}},{214:214,226:226,228:228,234:234,236:236,81:81}],216:[function(t,e,n){e.exports={en_us:{cancel:"Cancel",overlay_text:"Don't see the secure PayPal browser? We'll help you re-launch the window to complete your purchase.",continue_link:"Continue"},en_uk:{cancel:"Cancel",overlay_text:"Don't see the secure PayPal browser? We'll help you re-launch the window to complete your purchase.",continue_link:"Continue"},en_au:{cancel:"Cancel",overlay_text:"Don't see the secure PayPal browser? We'll help you re-launch the window to complete your purchase.",continue_link:"Continue"},sv_se:{cancel:"Avbryt",overlay_text:"Ser du inte den sÃ¤kra PayPal-webbl&auml;saren? Vi hj&auml;lper dig att starta om f&ouml;nstret f&ouml;r att slutf&ouml;ra k&ouml;pet.",continue_link:"Forts&auml;tt"},de_de:{cancel:"Abbrechen",overlay_text:"Sie sehen das sichere Browserfenster von PayPal nicht? Das Fenster wird neu ge&ouml;ffnet, damit Sie Ihren Einkauf abschlie&szlig;en k&ouml;nnen.",continue_link:"Weiter"},fr_fr:{cancel:"Annuler",overlay_text:"Vous ne voyez pas le navigateur s&eacute;curis&eacute; PayPal ? Nous allons vous aider &agrave; relancer la fen&ecirc;tre pour effectuer votre achat.",continue_link:"Continuer"},en_ca:{cancel:"Cancel",overlay_text:"Don't see the secure PayPal browser? We'll help you re-launch the window to complete your purchase.",continue_link:"Continue"},fr_ca:{cancel:"Annuler",overlay_text:"Vous ne voyez pas le navigateur s&eacute;curis&eacute; de PayPal ? Nous vous aiderons &agrave; relancer la fen&ecirc;tre afin d'effectuer votre achat.",continue_link:"Continuer"},es_es:{cancel:"Cancelar",overlay_text:"&iquest;No ves el s&iacute;mbolo de navegaci&oacute;n segura de PayPal? Te ayudaremos a abrir de nuevo la ventana para completar la compra.",continue_link:"Continuar"},es_xc:{cancel:"Cancelar",overlay_text:"&iquest;No ve el s&iacute;mbolo de navegaci&oacute;n segura de PayPal? Abriremos la ventana nuevamente para que pueda completar su compra.",continue_link:"Continuar"},fr_xc:{cancel:"Annuler",overlay_text:"Le navigateur s&eacute;curis&eacute; de PayPal n'appara&icirc;t pas ? Nous allons vous aider &agrave; rouvrir la fen&ecirc;tre pour finaliser votre achat.",continue_link:"Continuer"},nl_nl:{cancel:"Annuleren",overlay_text:"Ziet u de beveiligde PayPal-browser niet? We helpen u het venster opnieuw te openen zodat u uw aankoop kunt voltooien.",continue_link:"Doorgaan"},pt_pt:{cancel:"Cancelar",overlay_text:"N&atilde;o est&aacute; a ver a indica&ccedil;&atilde;o de liga&ccedil;&atilde;o segura PayPal no browser? Vamos ent&atilde;o voltar a abrir a janela para concluir a sua compra.",continue_link:"Continuar"},ru_ru:{cancel:"ÐžÑ‚Ð¼ÐµÐ½Ð°",overlay_text:"ÐÐµ Ð¾Ñ‚Ð¾Ð±Ñ€Ð°Ð¶Ð°ÐµÑ‚ÑÑ Ð±ÐµÐ·Ð¾Ð¿Ð°ÑÐ½Ð°Ñ ÑÑ‚Ñ€Ð°Ð½Ð¸Ñ†Ð° PayPal Ð² Ð±Ñ€Ð°ÑƒÐ·ÐµÑ€Ðµ? ÐœÑ‹ Ð¿Ð¾Ð¼Ð¾Ð¶ÐµÐ¼ Ð²Ð°Ð¼ Ð¿Ð¾Ð²Ñ‚Ð¾Ñ€Ð½Ð¾ Ð·Ð°Ð³Ñ€ÑƒÐ·Ð¸Ñ‚ÑŒ Ð¾ÐºÐ½Ð¾, Ñ‡Ñ‚Ð¾Ð±Ñ‹ Ð·Ð°Ð²ÐµÑ€ÑˆÐ¸Ñ‚ÑŒ Ð¿Ð¾ÐºÑƒÐ¿ÐºÑƒ.",continue_link:"ÐŸÑ€Ð¾Ð´Ð¾Ð»Ð¶Ð¸Ñ‚ÑŒ"},da_dk:{cancel:"Annuller",overlay_text:"Kan du ikke se PayPals sikre browser? Vi hj&aelig;lper dig med at &aring;bne vinduet igen, s&aring; du kan betale.",continue_link:"Forts&aelig;t"},it_it:{cancel:"Annulla",overlay_text:"Non vedi il browser sicuro di PayPal? Ti aiuteremo a riavviare la pagina per completare l'acquisto.",continue_link:"Continua"},no_no:{cancel:"Avbryt",overlay_text:"Ser du ikke den sikre PayPal-nettleseren? Vi hjelper deg med &aring; &aring;pne vinduet p&aring; nytt s&aring; du kan fullf&oslash;re kj&oslash;pet.",continue_link:"Fortsett"},pl_pl:{cancel:"Anuluj",overlay_text:"Nie widzisz bezpiecznej przeglÄ…darki PayPal? PomoÅ¼emy Ci ponownie uruchomiÄ‡ to okno w celu dokonania zakupu.",continue_link:"Kontynuuj"},tr_tr:{cancel:"Ä°ptal",overlay_text:"G&uuml;venli PayPal tarayÄ±cÄ±sÄ±nÄ± g&ouml;rm&uuml;yor musunuz? AlÄ±ÅŸveriÅŸinizi tamamlamak i&ccedil;in pencereyi yeniden baÅŸlatmanÄ±za yardÄ±mcÄ± olacaÄŸÄ±z.",continue_link:"Devam"},zh_xc:{cancel:"å–æ¶ˆ",overlay_text:"æ²¡æœ‰çœ‹åˆ°å®‰å…¨çš„PayPalæµè§ˆå™¨ï¼Ÿæˆ‘ä»¬å°†å¸®åŠ©æ‚¨é‡å¯çª—å£ä»¥å®Œæˆè´­ç‰©ã€‚",continue_link:"ç»§ç»­"},en_hk:{cancel:"Cancel",overlay_text:"Don't see the secure PayPal browser? We'll help you re-launch the window to complete your purchase.",continue_link:"Continue"},zh_hk:{cancel:"å–æ¶ˆ",overlay_text:"çœ‹ä¸åˆ°å®‰å…¨çš„ PayPal ç€è¦½å™¨è¦–çª—ï¼Ÿæˆ‘å€‘æœƒåŠ©ä½ é‡æ–°å•Ÿå‹•è¦–çª—ï¼Œä»¥å®Œæˆè³¼ç‰©ã€‚",continue_link:"ç¹¼çºŒ"},en_my:{cancel:"Cancel",overlay_text:"Don't see the secure PayPal browser? We'll help you re-launch the window to complete your purchase.",continue_link:"Continue"},en_nz:{cancel:"Cancel",overlay_text:"Don't see the secure PayPal browser? We'll help you re-launch the window to complete your purchase.",continue_link:"Continue"},en_sg:{cancel:"Cancel",overlay_text:"Don't see the secure PayPal browser? We'll help you re-launch the window to complete your purchase.",continue_link:"Continue"}}},{}],217:[function(t,e,n){(function(n){"use strict";function i(t){var e=this;this.options=t||{},this.destructor=new a,this.bus=new c({merchantUrl:n.location.href,channel:this.options.channel}),this.destructor.registerFunctionForTeardown(function(){e.bus.teardown()}),this._initialize()}var o=t(95),r=t(151),s=t(234),a=t(85),c=t(163),u=t(226),l=t(225),h=t(222);i.prototype._initialize=function(){var t=this;this.app=s.isPopupSupported()?new l({src:this._buildUrl(),isHermes:this.options.isHermes,channel:this.options.channel}):new h({src:this._buildUrl(),isDropin:this.options.isDropin,isHermes:this.options.isHermes,insertFrameFunction:this.options.insertFrameFunction,channel:this.options.channel}),this.destructor.registerFunctionForTeardown(function(){t.app.teardown()}),this.bus.on(u.events.CLOSE_APP,o(this.close,this)),this.bus.on(u.events.FOCUS_APP,o(this.focus,this)),this.bus.on(c.events.PAYMENT_METHOD_GENERATED,o(this._handlePaymentMethodGenerated,this)),this.bus.on(c.events.UI_POPUP_FORCE_CLOSE,o(this._handleForceClose,this))},i.prototype._buildUrl=function(){var t=this.options.paypalAssetsUrl;return t+="/pwpp/",t+=u.VERSION,t+="/html/braintree-frame.html",t+="#"+this.options.channel},i.prototype.open=function(){this.focus(),this.app.open(),this.poll()},i.prototype._handleForceClose=function(t){t.target===u.PAYPAL_INTEGRATION_NAME&&this.close()},i.prototype.close=function(){this.app.close()},i.prototype.focus=function(){r(this.app.focus)&&this.app.focus()},i.prototype.isClosed=function(){return this.app.isClosed()},i.prototype.stopPolling=function(){clearInterval(this.pollId)},i.prototype.poll=function(){var t=this;this.pollId=setInterval(function(){t.isClosed()&&t._handleClosed()},100)},i.prototype._handlePaymentMethodGenerated=function(t){t.type===u.NONCE_TYPE&&this.close()},i.prototype._handleClosed=function(){this.stopPolling(),this.close(),s.isPopupSupported()&&(this.app.el=null)},i.prototype.teardown=function(){this.destructor.teardown()},e.exports=i}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{151:151,163:163,222:222,225:225,226:226,234:234,85:85,95:95}],218:[function(t,e,n){"use strict";function i(t){this.options=t||{},this.el=r({src:this._buildUrl(),name:o.BRIDGE_FRAME_NAME,height:1,width:1,style:{position:"static",top:0,left:0,bottom:0,padding:0,margin:0,border:0,outline:"none",background:"transparent"}}),this.options.container.appendChild(this.el)}var o=t(226),r=t(90);i.prototype._buildUrl=function(){var t=this.options.paypalAssetsUrl;return t+="/pwpp/",t+=o.VERSION,t+="/html/bridge-frame.html",t+="#"+this.options.channel},i.prototype.teardown=function(){this.options.container.removeChild(this.el)},e.exports=i},{226:226,90:90}],219:[function(t,e,n){(function(n){"use strict";function i(t){var e;this.options=t||{},this.wrapper=this.options.container||document.body,this.destructor=new s,this.bus=new a({merchantUrl:n.location.href,channel:t.channel}),e=h(this.options.locale,p),this.translation=e.translation,this._initialize()}var o=t(81),r=t(95),s=t(85),a=t(163),c=t(236),u=t(235),l=t(226),h=t(229),p=t(216);i.prototype._initialize=function(){var t=this,e=r(this._handleClickLogout,this);this._createViewContainer(),this._createPayPalName(),this._createEmailNode(),this._createLogoutNode(),o.addEventListener(this.logoutNode,"click",e),this.destructor.registerFunctionForTeardown(function(){o.removeEventListener(t.logoutNode,"click",e)}),this.bus.on(a.events.PAYMENT_METHOD_GENERATED,r(this._handlePaymentMethodGenerated,this)),this.bus.on(a.events.PAYMENT_METHOD_CANCELLED,r(this._handlePaymentMethodCancelled,this))},i.prototype._createViewContainer=function(){var t=["display: none","max-width: 500px","overflow: hidden","padding: 16px","background-image: url("+this.options.paypalAssetsUrl+"/pwpp/"+l.VERSION+"/images/paypal-small.png)","background-image: url("+this.options.paypalAssetsUrl+"/pwpp/"+l.VERSION+"/images/paypal-small.svg), none","background-position: 20px 50%","background-repeat: no-repeat","background-size: 13px 15px","border-top: 1px solid #d1d4d6","border-bottom: 1px solid #d1d4d6"].join(";");

this.container=document.createElement("div"),this.container.id="braintree-paypal-loggedin",this.container.style.cssText=t,this.wrapper.appendChild(this.container)},i.prototype._createPayPalName=function(){var t=["color: #283036","font-size: 13px","font-weight: 800",'font-family: "Helvetica Neue", Helvetica, Arial, sans-serif',"margin-left: 36px","-webkit-font-smoothing: antialiased","-moz-font-smoothing: antialiased","-ms-font-smoothing: antialiased","font-smoothing: antialiased"].join(";");return this.payPalName=document.createElement("span"),this.payPalName.id="bt-pp-name",this.payPalName.innerHTML="PayPal",this.payPalName.style.cssText=t,this.container.appendChild(this.payPalName)},i.prototype._createEmailNode=function(){var t=["color: #6e787f","font-size: 13px",'font-family: "Helvetica Neue", Helvetica, Arial, sans-serif',"margin-left: 5px","-webkit-font-smoothing: antialiased","-moz-font-smoothing: antialiased","-ms-font-smoothing: antialiased","font-smoothing: antialiased"].join(";");this.emailNode=document.createElement("span"),this.emailNode.id="bt-pp-email",this.emailNode.style.cssText=t,this.container.appendChild(this.emailNode)},i.prototype._createLogoutNode=function(){var t=["color: #3d95ce","font-size: 11px",'font-family: "Helvetica Neue", Helvetica, Arial, sans-serif',"line-height: 20px","margin: 0 0 0 25px","padding: 0","background-color: transparent","border: 0","cursor: pointer","text-decoration: underline","float: right","-webkit-font-smoothing: antialiased","-moz-font-smoothing: antialiased","-ms-font-smoothing: antialiased","font-smoothing: antialiased"].join(";");this.logoutNode=document.createElement("button"),this.logoutNode.id="bt-pp-cancel",this.logoutNode.innerHTML=this.translation.cancel,this.logoutNode.style.cssText=t,this.container.appendChild(this.logoutNode)},i.prototype.show=function(t){this.container.style.display="block",u.setTextContent(this.emailNode,t)},i.prototype.hide=function(){this.container.style.display="none"},i.prototype._handleClickLogout=function(t){c.preventDefault(t),this.bus.emit(a.events.PAYMENT_METHOD_CANCELLED,{source:l.PAYPAL_INTEGRATION_NAME})},i.prototype._handlePaymentMethodGenerated=function(t){var e;t.type===l.NONCE_TYPE&&(e=t&&t.details&&t.details.email?t.details.email:"",this.show(e))},i.prototype._handlePaymentMethodCancelled=function(t){t.source===l.PAYPAL_INTEGRATION_NAME&&this.hide()},i.prototype.teardown=function(){this.wrapper.removeChild(this.container),this.destructor.teardown(),this.bus.teardown()},e.exports=i}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{163:163,216:216,226:226,229:229,235:235,236:236,81:81,85:85,95:95}],220:[function(t,e,n){(function(n){"use strict";function i(t){this.options=t,this.wrapper=this.options.container||document.body,this.bus=new r({merchantUrl:n.location.href,channel:t.channel}),this._initialize()}var o=t(95),r=t(163),s=t(226),a=t(228);i.prototype._initialize=function(){this.createViewContainer(),this.options.enablePayPalButton?this.createCheckoutWithPayPalButton():this.createPayWithPayPalButton(),this.bus.on(r.events.PAYMENT_METHOD_GENERATED,o(this._handlePaymentMethodGenerated,this)),this.bus.on(r.events.PAYMENT_METHOD_CANCELLED,o(this._handlePaymentMethodCancelled,this))},i.prototype.createViewContainer=function(){this.container=document.createElement("div"),this.container.id="braintree-paypal-loggedout",this.wrapper.appendChild(this.container),this.loginNode=this.container},i.prototype.createPayWithPayPalButton=function(){var t=document.createElement("a"),e=new Image,n=["max-width: 100%","display: block","width: 100%","height: 100%","outline: none","border: 0"].join(";"),i=["display: block","width: 115px","height: 44px","overflow: hidden"].join(";");t.id="braintree-paypal-button",t.href="#",t.style.cssText=i,e.src=this.options.paypalAssetsUrl+"/pwpp/"+s.VERSION+"/images/pay-with-paypal.png",e.setAttribute("alt","Pay with PayPal"),e.style.cssText=n,t.appendChild(e),this.container.appendChild(t)},i.prototype.createCheckoutWithPayPalButton=function(){var t,e=document.createElement("script"),n={"data-merchant":"merchant-id","data-button":"checkout","data-type":"button","data-color":"blue","data-lc":a(this.options.locale)};e.src="//www.paypalobjects.com/api/button.js",e.async=!0;for(t in n)n.hasOwnProperty(t)&&e.setAttribute(t,n[t]);this.container.appendChild(e)},i.prototype.show=function(){this.container.style.display="block"},i.prototype.hide=function(){this.container.style.display="none"},i.prototype._handlePaymentMethodGenerated=function(t){t.type===s.NONCE_TYPE&&this.hide()},i.prototype._handlePaymentMethodCancelled=function(t){t.source===s.PAYPAL_INTEGRATION_NAME&&this.show()},i.prototype.teardown=function(){this.wrapper.removeChild(this.container),this.bus.teardown()},e.exports=i}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{163:163,226:226,228:228,95:95}],221:[function(t,e,n){(function(n){"use strict";function i(t){this.options=t,this.bus=new s({merchantUrl:n.location.href,channel:t.channel}),this.bus.on(c.events.UI_MODAL_DID_OPEN,a(this.lockWindowSize,this)),this.bus.on(c.events.UI_MODAL_DID_CLOSE,a(this.unlockWindowSize,this))}function o(t){var e=window.getComputedStyle?getComputedStyle(t):t.currentStyle;return{overflow:e.overflow||"",height:t.style.height||""}}function r(){return{html:{node:document.documentElement,styles:o(document.documentElement)},body:{node:document.body,styles:o(document.body)}}}var s=t(163),a=t(95),c=t(226);i.prototype.lockWindowSize=function(){this.defaultStyles=r(),document.documentElement.style.height="100%",document.documentElement.style.overflow="hidden",document.body.style.height="100%",document.body.style.overflow="hidden"},i.prototype.unlockWindowSize=function(){this.defaultStyles&&(document.documentElement.style.height=this.defaultStyles.html.styles.height,document.documentElement.style.overflow=this.defaultStyles.html.styles.overflow,document.body.style.height=this.defaultStyles.body.styles.height,document.body.style.overflow=this.defaultStyles.body.styles.overflow,delete this.defaultStyles)},i.prototype._handleUIModalDidOpen=function(t){t.source===c.PAYPAL_INTEGRATION_NAME&&this.lockWindowSize()},i.prototype._handleUIModalDidClose=function(t){t.source===c.PAYPAL_INTEGRATION_NAME&&this.unlockWindowSize()},i.prototype.teardown=function(){this.unlockWindowSize(),this.bus.teardown()},e.exports=i}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{163:163,226:226,95:95}],222:[function(t,e,n){(function(n){"use strict";function i(t){this.options=t||{},this.container=document.body,this.bus=new c({merchantUrl:n.location.href,channel:t.channel}),this.options.isDropin?this._open=this._openHeadless:this._attachBusEvents(),this._initialize()}var o=t(95),r=t(151),s=t(234),a=t(226),c=t(163),u=t(90);i.prototype._attachBusEvents=function(){this.bus.on(a.events.OPEN_MODAL,o(this.open,this))},i.prototype._initialize=function(){var t=this.options.isHermes?a.HERMES_FRAME_NAME:a.FRAME_NAME;this.el=u({src:this.options.src,name:t,height:this.options.height||"100%",width:this.options.width||"100%",style:{position:s.isMobile()?"absolute":"fixed",top:0,left:0,bottom:0,padding:0,margin:0,border:0,outline:"none",zIndex:20001,background:"#FFFFFF"}})},i.prototype.isClosed=function(){return!this.container.contains(this.el)},i.prototype._openHeadless=function(){this.bus.emit(a.events.OPEN_MODAL)},i.prototype._open=function(){r(this.options.insertFrameFunction)?this.options.insertFrameFunction(this.el.src):this.container.appendChild(this.el),this.bus.emit(a.events.UI_MODAL_DID_OPEN,{source:a.PAYPAL_INTEGRATION_NAME})},i.prototype.open=function(){this.isClosed()&&this._open()},i.prototype.close=function(){this.isClosed()||(this.container.removeChild(this.el),this.bus.emit(a.events.UI_MODAL_DID_CLOSE,{source:a.PAYPAL_INTEGRATION_NAME}))},i.prototype.teardown=function(){this.close(),this.bus.teardown()},e.exports=i}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{151:151,163:163,226:226,234:234,90:90,95:95}],223:[function(t,e,n){(function(n){"use strict";function i(t){var e;this.options=t,this.spriteSrc=this.options.paypalAssetsUrl+"/pwpp/"+u.VERSION+"/images/pp_overlay_sprite.png",this.bus=new c({merchantUrl:n.location.href,channel:t.channel}),this.destructor=new a,e=l(this.options.locale,h),this.translation=e.translation,this._create(),this._setupEvents(),this.bus.on(c.events.UI_POPUP_DID_OPEN,r(this._handleUIPopupDidOpen,this)),this.bus.on(c.events.UI_POPUP_DID_CLOSE,r(this._handleUIPopupDidClose,this))}var o=t(81),r=t(95),s=t(151),a=t(85),c=t(163),u=t(226),l=t(229),h=t(216);i.prototype.open=function(){document.body.contains(this.el)||document.body.appendChild(this.el)},i.prototype.close=function(){document.body.contains(this.el)&&document.body.removeChild(this.el)},i.prototype._handleUIPopupDidClose=function(t){t.source===u.PAYPAL_INTEGRATION_NAME&&this.close()},i.prototype._handleUIPopupDidOpen=function(t){t.source===u.PAYPAL_INTEGRATION_NAME&&this.open()},i.prototype._create=function(){this.el=document.createElement("div"),this.el.className="bt-overlay",this._setStyles(this.el,["z-index: 20001","position: fixed","top: 0","left: 0","height: 100%","width: 100%","text-align: center","background: #000","background: rgba(0,0,0,0.7)",'-ms-filter: "progid:DXImageTransform.Microsoft.Alpha(Opacity=52)"']),this.el.appendChild(this._createCloseIcon()),this.el.appendChild(this._createMessage())},i.prototype._createCloseIcon=function(){return this.closeIcon=document.createElement("div"),this.closeIcon.className="bt-close-overlay",this._setStyles(this.closeIcon,["position: absolute","top: 10px","right: 10px","cursor: pointer","background: url("+this.spriteSrc+") no-repeat 0 -67px","height: 14px","width: 14px"]),this.closeIcon},i.prototype._createMessage=function(){var t=document.createElement("div");return this._setStyles(t,["position: relative","top: 50%","max-width: 350px",'font-family: "HelveticaNeue", "HelveticaNeue-Light", "Helvetica Neue Light", helvetica, arial, sans-serif',"font-size: 14px","line-height: 20px","margin: -70px auto 0"]),t.appendChild(this._createLogo()),t.appendChild(this._createExplanation()),t.appendChild(this._createFocusLink()),t},i.prototype._createExplanation=function(){return this.explanation=document.createElement("div"),this._setStyles(this.explanation,["color: #FFF","margin-bottom: 20px"]),this.explanation.innerHTML=this.translation.overlay_text,this.explanation},i.prototype._createLogo=function(){var t=document.createElement("div");return this._setStyles(t,["background: url("+this.spriteSrc+") no-repeat 0 0","width: 94px","height: 25px","margin: 0 auto 26px auto"]),t},i.prototype._createFocusLink=function(){return this.focusLink=document.createElement("a"),this._setStyles(this.focusLink,["color: #009be1","cursor: pointer"]),this.focusLink.innerHTML=this.translation.continue_link,this.focusLink},i.prototype._setStyles=function(t,e){var n=e.join(";");t.style.cssText=n},i.prototype._setupEvents=function(){var t=this,e=r(this._handleClose,this),n=r(this._handleFocus,this);o.addEventListener(this.closeIcon,"click",e),o.addEventListener(this.focusLink,"click",n),this.destructor.registerFunctionForTeardown(function(){o.removeEventListener(t.closeIcon,"click",e),o.removeEventListener(t.focusLink,"click",n)})},i.prototype._handleClose=function(t){t.preventDefault(),this.close(),s(this.options.onClose)&&this.options.onClose()},i.prototype._handleFocus=function(t){t.preventDefault(),s(this.options.onFocus)&&this.options.onFocus()},i.prototype.teardown=function(){this.bus.teardown(),this.destructor.teardown(),this.close()},e.exports=i}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{151:151,163:163,216:216,226:226,229:229,81:81,85:85,95:95}],224:[function(t,e,n){(function(n){"use strict";function i(t){this.options=t||{},this.container=this.options.container||document.body,this.el=this.options.el,this.destructor=new a,this.bus=new c({merchantUrl:n.location.href,channel:t.channel}),this._initialize()}var o=t(81),r=t(95),s=t(151),a=t(85),c=t(163),u=t(226);i.prototype._initialize=function(){var t=this;s(this.el)||(null!=this.el?(this.el=o.normalizeElement(this.el),this.destructor.registerFunctionForTeardown(function(){t.clear()})):this.el=this.create()),this.bus.on(c.events.PAYMENT_METHOD_GENERATED,r(this._handlePaymentMethodGenerated,this)),this.bus.on(c.events.PAYMENT_METHOD_CANCELLED,r(this._handlePaymentMethodCancelled,this))},i.prototype.create=function(){var t=this,e=document.createElement("input");return e.name="payment_method_nonce",e.type="hidden",this.container.appendChild(e),this.destructor.registerFunctionForTeardown(function(){t.container.removeChild(e)}),e},i.prototype.value=function(t){s(this.el)?this.el(t):this.el.value=t},i.prototype.clear=function(){this.value("")},i.prototype._handlePaymentMethodCancelled=function(t){t.source===u.PAYPAL_INTEGRATION_NAME&&this.clear()},i.prototype._handlePaymentMethodGenerated=function(t){t.type===u.NONCE_TYPE&&this.value(t.nonce)},i.prototype.teardown=function(){this.destructor.teardown(),this.bus.teardown()},e.exports=i}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{151:151,163:163,226:226,81:81,85:85,95:95}],225:[function(t,e,n){(function(n){"use strict";function i(t){this.options=t,this.bus=new r({merchantUrl:n.location.href,channel:this.options.channel}),t.isHermes?(this.name=o.HERMES_POPUP_NAME,this.popupHeight=o.HERMES_POPUP_HEIGHT,this.popupWidth=o.HERMES_POPUP_WIDTH):(this.name=o.POPUP_NAME,this.popupHeight=o.POPUP_HEIGHT,this.popupWidth=o.POPUP_WIDTH)}var o=t(226),r=t(163),s=t(230);i.prototype._getPopupOptions=function(){return["height="+this.popupHeight,"width="+this.popupWidth,"top="+this._getTopPosition(),"left="+this._getLeftPosition(),o.POPUP_OPTIONS].join(",")},i.prototype._centerPosition=function(t,e,n){return(t-e)/2+n},i.prototype._getTopPosition=function(){var t=window.outerHeight||document.documentElement.clientHeight,e="undefined"==typeof window.screenY?window.screenTop:window.screenY;return this._centerPosition(t,this.popupHeight,e)},i.prototype._getLeftPosition=function(){var t=window.outerWidth||document.documentElement.clientWidth,e="undefined"==typeof window.screenX?window.screenLeft:window.screenX;return this._centerPosition(t,this.popupWidth,e)},i.prototype.isClosed=function(){return this.el?this.el.closed:void 0},i.prototype.open=function(){this.el||(this.el=window.open(this.options.src,this.name,this._getPopupOptions()),this.focus(),this.bus.emit(r.events.UI_POPUP_DID_OPEN,{source:o.PAYPAL_INTEGRATION_NAME}))},i.prototype.close=function(){this.el&&((s.isIE8()&&!this.isClosed()||!s.isIE8())&&this.el.close(),this.bus.emit(r.events.UI_POPUP_DID_CLOSE,{source:o.PAYPAL_INTEGRATION_NAME}))},i.prototype.focus=function(){this.el&&this.el.focus()},i.prototype.teardown=function(){this.close(),this.bus.teardown()},e.exports=i}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{163:163,226:226,230:230}],226:[function(t,e,n){"use strict";var i,o="2.17.1",r=["GET_CLIENT_TOKEN","GET_CLIENT_OPTIONS","OPEN_MODAL","CLOSE_APP","FOCUS_APP","UI_MODAL_DID_OPEN","UI_MODAL_DID_CLOSE"],s={LEGACY_ONETIME:"Legacy Onetime",HERMES_ONETIME:"Hermes Onetime",LEGACY_FUTURE_PAYMENTS:"Legacy Future Payments",HERMES_BILLING_AGREEMENTS:"Hermes Billing Agreements"};for(n.VERSION=o,n.POPUP_NAME="braintree_paypal_popup",n.HERMES_POPUP_NAME="PPFrameRedirect",n.FRAME_NAME="braintree-paypal-frame",n.HERMES_FRAME_NAME="PPFrameRedirect",n.POPUP_PATH="/pwpp/"+o+"/html/braintree-frame.html",n.POPUP_OPTIONS="resizable,scrollbars",n.POPUP_HEIGHT=470,n.POPUP_WIDTH=410,n.HERMES_POPUP_HEIGHT=535,n.HERMES_POPUP_WIDTH=450,n.BRIDGE_FRAME_NAME="bt-proxy-frame",n.HERMES_SUPPORTED_CURRENCIES=["USD","GBP","EUR","AUD","CAD","DKK","NOK","PLN","SEK","CHF","TRY","BRL"],n.HERMES_SUPPORTED_COUNTRIES=["US","GB","AU","CA","ES","FR","DE","IT","NL","NO","PL","CH","TR","DK","BE","AT"],n.NONCE_TYPE="PayPalAccount",n.PAYPAL_INTEGRATION_NAME="PayPal",n.ILLEGAL_XHR_ERROR="Illegal XHR request attempted",n.CONFIGURATION_TYPES=s,n.events={},i=0;i<r.length;i++)n.events[r[i]]="paypal:"+r[i]},{}],227:[function(t,e,n){"use strict";e.exports={us:"en_us",gb:"en_uk",uk:"en_uk",de:"de_de",fr:"fr_fr",it:"it_it",es:"es_es",ca:"en_ca",au:"en_au",at:"de_de",be:"en_us",ch:"de_de",dk:"da_dk",nl:"nl_nl",no:"no_no",pl:"pl_pl",se:"sv_se",tr:"tr_tr",bg:"en_us",cy:"en_us",hr:"en_us",is:"en_us",kh:"en_us",mt:"en_us",my:"en_us",ru:"ru_ru"}},{}],228:[function(t,e,n){"use strict";function i(t){return-1!==t.indexOf("_")&&5===t.length}function o(t){var e,n;for(e in s)s.hasOwnProperty(e)&&(e===t?n=s[e]:s[e]===t&&(n=s[e]));return n}function r(t){var e,n;return t=t?t.toLowerCase():"us",t=t.replace(/-/g,"_"),e=i(t)?t:o(t),e?(n=e.split("_"),[n[0],n[1].toUpperCase()].join("_")):"en_US"}var s=t(227);e.exports=r},{227:227}],229:[function(t,e,n){"use strict";function i(t){var e=t?t.toLowerCase().replace(/-/g,"_"):"us";return-1!==e.indexOf("_")&&(e=e.split("_")[1]),e=s[e]?e:"us","uk"===e&&(e="gb"),e}function o(t,e){return t=t.toLowerCase(),e[t]?e[t]:e.en_us}function r(t,e){var n=i(t),r=a(t),s=o(r,e);return{country:n,locale:r,translation:s}}var s=t(227),a=t(228);e.exports=r},{227:227,228:228}],230:[function(t,e,n){"use strict";function i(){return f.matchUserAgent("Android")&&!o()}function o(){return f.matchUserAgent("Chrome")||f.matchUserAgent("CriOS")}function r(){return f.matchUserAgent("Firefox")}function s(){return f.matchUserAgent("Trident")||f.matchUserAgent("MSIE")}function a(){return f.matchUserAgent(/MSIE 8\.0/)}function c(){return f.matchUserAgent("Opera")||f.matchUserAgent("OPR")}function u(){return c()&&"[object OperaMini]"===Object.prototype.toString.call(window.operamini)}function l(){return f.matchUserAgent("Safari")&&!o()&&!i()}function h(){return d.isIos()&&!o()&&!l()}function p(){var t=/Version\/[\w\.]+ Chrome\/[\w\.]+ Mobile/;return d.isAndroid()&&f.matchUserAgent(t)}var f=t(233),d=t(232);e.exports={isAndroid:i,isChrome:o,isFirefox:r,isIE:s,isIE8:a,isOpera:c,isOperaMini:u,isSafari:l,isIosWebView:h,isAndroidWebView:p}},{232:232,233:233}],231:[function(t,e,n){"use strict";function i(){return!o()&&(a.isAndroid()||a.isIpod()||a.isIphone()||s.matchUserAgent("IEMobile"))}function o(){return a.isIpad()||a.isAndroid()&&!s.matchUserAgent("Mobile")}function r(){return!i()&&!o()}var s=t(233),a=t(232);e.exports={isMobile:i,isTablet:o,isDesktop:r}},{232:232,233:233}],232:[function(t,e,n){"use strict";function i(){return c.matchUserAgent("Android")}function o(){return c.matchUserAgent("iPad")}function r(){return c.matchUserAgent("iPod")}function s(){return c.matchUserAgent("iPhone")&&!r()}function a(){return o()||r()||s()}var c=t(233);e.exports={isAndroid:i,isIpad:o,isIpod:r,isIphone:s,isIos:a}},{233:233}],233:[function(t,e,n){"use strict";function i(){return r}function o(t){var e=n.getNativeUserAgent(),i=e.match(t);return i?!0:!1}var r=window.navigator.userAgent;n.getNativeUserAgent=i,n.matchUserAgent=o},{}],234:[function(t,e,n){"use strict";function i(){return o()&&window.outerWidth<600}function o(){return m.test(d)}function r(){return Boolean(window.postMessage)}function s(){if(l.isOperaMini())return!1;if(h.isDesktop())return!0;if(h.isMobile()||h.isTablet()){if(l.isIE())return!1;if(p.isAndroid())return l.isAndroidWebView()?!1:!0;if(p.isIos())return l.isChrome()?!1:l.isSafari()&&f.matchUserAgent(/OS (?:8_1|8_0|8)(?!_\d)/i)?!1:l.isIosWebView()?!1:!0}return!1}function a(){if(l.isIE8())return!1;try{return window.self===window.top}catch(t){return!1}}function c(){return l.isIE()}function u(){var t=null,e="";try{new ActiveXObject("")}catch(n){e=n.name}try{t=Boolean(new ActiveXObject("htmlfile"))}catch(n){t=!1}return t="ReferenceError"!==e&&t===!1?!1:!0,!t}var l=t(230),h=t(231),p=t(232),f=t(233),d=window.navigator.userAgent,m=/[Mm]obi|tablet|iOS|Android|IEMobile|Windows\sPhone/;e.exports={isMobile:i,isMobileDevice:o,detectedPostMessage:r,isPopupSupported:s,isOverlaySupported:a,isBridgeIframeRequired:c,isMetroBrowser:u}},{230:230,231:231,232:232,233:233}],235:[function(t,e,n){"use strict";function i(t,e){var n="innerText";document&&document.body&&"textContent"in document.body&&(n="textContent"),t[n]=e}e.exports={setTextContent:i}},{}],236:[function(t,e,n){"use strict";function i(){var t,e,n="";for(t=0;32>t;t++)e=Math.floor(16*Math.random()),n+=e.toString(16);return n}function o(t){return/^(true|1)$/i.test(t)}function r(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/\'/g,"&apos;")}function s(t){var e,n,i,o,r,s,a,c,u=t.indexOf("?"),l={};if(u>=0&&(t=t.substr(u+1)),0===t.length)return null;for(e=t.split("&"),n=0,i=e.length;i>n;n++)o=e[n],r=o.indexOf("="),s=o.substr(0,r),c=o.substr(r+1),a=decodeURIComponent(c),a=a.replace(/</g,"&lt;").replace(/>/g,"&gt;"),"false"===a&&(a=!1),(null==a||"true"===a)&&(a=!0),l[s]=a;return l}function a(t){t.preventDefault?t.preventDefault():t.returnValue=!1}function c(t){var e;return e=Boolean(t.merchantConfiguration.paypal.amount)&&Boolean(t.merchantConfiguration.paypal.currency)?f.CONFIGURATION_TYPES.HERMES_ONETIME:f.CONFIGURATION_TYPES.LEGACY_ONETIME}function u(t){var e;return e=Boolean(t.gatewayConfiguration.paypal.billingAgreementsEnabled)?f.CONFIGURATION_TYPES.HERMES_BILLING_AGREEMENTS:f.CONFIGURATION_TYPES.LEGACY_FUTURE_PAYMENTS}function l(t){var e;return e=Boolean(t.merchantConfiguration.paypal.singleUse)?c(t):u(t)}function h(t){var e=l(t);return e===f.CONFIGURATION_TYPES.HERMES_ONETIME||e===f.CONFIGURATION_TYPES.HERMES_BILLING_AGREEMENTS}function p(t){var e=l(t);return e===f.CONFIGURATION_TYPES.HERMES_ONETIME}var f=t(226),d="function"==typeof String.prototype.trim?function(t){return t.trim()}:function(t){return t.replace(/^\s+|\s+$/,"")},m="function"==typeof window.btoa?function(t){return window.btoa(t)}:function(t){for(var e,n,i,o,r,s,a,c="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",u="",l=0;l<t.length;)e=t.charCodeAt(l++),n=t.charCodeAt(l++),i=t.charCodeAt(l++),o=e>>2,r=(3&e)<<4|n>>4,s=(15&n)<<2|i>>6,a=63&i,isNaN(n)?s=a=64:isNaN(i)&&(a=64),u=u+c.charAt(o)+c.charAt(r)+c.charAt(s)+c.charAt(a);return u};e.exports={trim:d,btoa:m,generateUid:i,castToBoolean:o,htmlEscape:r,parseUrlParams:s,preventDefault:a,isHermesConfiguration:h,isOnetimeHermesConfiguration:p,getConfigurationType:l}},{226:226}]},{},[179])(179)});
}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/braintree-web/dist/braintree.js","/../../node_modules/braintree-web/dist")
},{"buffer":52,"oMfpAn":55}],3:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
module.exports = {
  number: require('./src/card-number'),
  expirationDate: require('./src/expiration-date'),
  expirationMonth: require('./src/expiration-month'),
  expirationYear: require('./src/expiration-year'),
  cvv: require('./src/cvv'),
  postalCode: require('./src/postal-code')
};

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/index.js","/../../node_modules/card-validator")
},{"./src/card-number":43,"./src/cvv":44,"./src/expiration-date":45,"./src/expiration-month":46,"./src/expiration-year":47,"./src/postal-code":50,"buffer":52,"oMfpAn":55}],4:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var isString = require('lodash/lang/isString');
var clone = require('lodash/lang/cloneDeep');

var types = [
  {
    niceType: 'Visa',
    type: 'visa',
    pattern: '^4\\d*$',
    gaps: [4, 8, 12],
    lengths: [16],
    code: {
      name: 'CVV',
      size: 3
    }
  },
  {
    niceType: 'MasterCard',
    type: 'master-card',
    pattern: '^5([1-5]\\d*)?$',
    gaps: [4, 8, 12],
    lengths: [16],
    code: {
      name: 'CVC',
      size: 3
    }
  },
  {
    niceType: 'American Express',
    type: 'american-express',
    pattern: '^3([47]\\d*)?$',
    isAmex: true,
    gaps: [4, 10],
    lengths: [15],
    code: {
      name: 'CID',
      size: 4
    }
  },
  {
    niceType: 'Diners Club',
    type: 'diners-club',
    pattern: '^3((0([0-5]\\d*)?)|[689]\\d*)?$',
    gaps: [4, 10],
    lengths: [14],
    code: {
      name: 'CVV',
      size: 3
    }
  },
  {
    niceType: 'Discover',
    type: 'discover',
    pattern: '^6(0|01|011\\d*|5\\d*|4|4[4-9]\\d*)?$',
    gaps: [4, 8, 12],
    lengths: [16],
    code: {
      name: 'CID',
      size: 3
    }
  },
  {
    niceType: 'JCB',
    type: 'jcb',
    pattern: '^((2|21|213|2131\\d*)|(1|18|180|1800\\d*)|(3|35\\d*))$',
    gaps: [4, 8, 12],
    lengths: [16],
    code: {
      name: 'CVV',
      size: 3
    }
  },
  {
    niceType: 'UnionPay',
    type: 'unionpay',
    pattern: '^6(2\\d*)?$',
    gaps: [4, 8, 12],
    lengths: [16, 17, 18, 19],
    code: {
      name: 'CVN',
      size: 3
    }
  },
  {
    niceType: 'Maestro',
    type: 'maestro',
    pattern: '^((5((0|[6-9])\\d*)?)|(6|6[37]\\d*))$',
    gaps: [4, 8, 12],
    lengths: [12, 13, 14, 15, 16, 17, 18, 19],
    code: {
      name: 'CVC',
      size: 3
    }
  }
];

module.exports = function getCardTypes(cardNumber) {
  var i, value;
  var result = [];

  if (!isString(cardNumber)) { return result; }

  if (cardNumber === '') { return clone(types); }

  for (i = 0; i < types.length; i++) {
    value = types[i];

    if (RegExp(value.pattern).test(cardNumber)) {
      result.push(clone(value));
    }
  }

  return result;
};

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/credit-card-type/index.js","/../../node_modules/card-validator/node_modules/credit-card-type")
},{"buffer":52,"lodash/lang/cloneDeep":31,"lodash/lang/isString":38,"oMfpAn":55}],5:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/* Native method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * Creates a function that invokes `func` with the `this` binding of the
 * created function and arguments from `start` and beyond provided as an array.
 *
 * **Note:** This method is based on the [rest parameter](https://developer.mozilla.org/Web/JavaScript/Reference/Functions/rest_parameters).
 *
 * @static
 * @memberOf _
 * @category Function
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @returns {Function} Returns the new function.
 * @example
 *
 * var say = _.restParam(function(what, names) {
 *   return what + ' ' + _.initial(names).join(', ') +
 *     (_.size(names) > 1 ? ', & ' : '') + _.last(names);
 * });
 *
 * say('hello', 'fred', 'barney', 'pebbles');
 * // => 'hello fred, barney, & pebbles'
 */
function restParam(func, start) {
  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  start = nativeMax(start === undefined ? (func.length - 1) : (+start || 0), 0);
  return function() {
    var args = arguments,
        index = -1,
        length = nativeMax(args.length - start, 0),
        rest = Array(length);

    while (++index < length) {
      rest[index] = args[start + index];
    }
    switch (start) {
      case 0: return func.call(this, rest);
      case 1: return func.call(this, args[0], rest);
      case 2: return func.call(this, args[0], args[1], rest);
    }
    var otherArgs = Array(start + 1);
    index = -1;
    while (++index < start) {
      otherArgs[index] = args[index];
    }
    otherArgs[start] = rest;
    return func.apply(this, otherArgs);
  };
}

module.exports = restParam;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/function/restParam.js","/../../node_modules/card-validator/node_modules/lodash/function")
},{"buffer":52,"oMfpAn":55}],6:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * Copies the values of `source` to `array`.
 *
 * @private
 * @param {Array} source The array to copy values from.
 * @param {Array} [array=[]] The array to copy values to.
 * @returns {Array} Returns `array`.
 */
function arrayCopy(source, array) {
  var index = -1,
      length = source.length;

  array || (array = Array(length));
  while (++index < length) {
    array[index] = source[index];
  }
  return array;
}

module.exports = arrayCopy;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/internal/arrayCopy.js","/../../node_modules/card-validator/node_modules/lodash/internal")
},{"buffer":52,"oMfpAn":55}],7:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * A specialized version of `_.forEach` for arrays without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Array} array The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns `array`.
 */
function arrayEach(array, iteratee) {
  var index = -1,
      length = array.length;

  while (++index < length) {
    if (iteratee(array[index], index, array) === false) {
      break;
    }
  }
  return array;
}

module.exports = arrayEach;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/internal/arrayEach.js","/../../node_modules/card-validator/node_modules/lodash/internal")
},{"buffer":52,"oMfpAn":55}],8:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var keys = require('../object/keys');

/**
 * A specialized version of `_.assign` for customizing assigned values without
 * support for argument juggling, multiple sources, and `this` binding `customizer`
 * functions.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @param {Function} customizer The function to customize assigned values.
 * @returns {Object} Returns `object`.
 */
function assignWith(object, source, customizer) {
  var index = -1,
      props = keys(source),
      length = props.length;

  while (++index < length) {
    var key = props[index],
        value = object[key],
        result = customizer(value, source[key], key, object, source);

    if ((result === result ? (result !== value) : (value === value)) ||
        (value === undefined && !(key in object))) {
      object[key] = result;
    }
  }
  return object;
}

module.exports = assignWith;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/internal/assignWith.js","/../../node_modules/card-validator/node_modules/lodash/internal")
},{"../object/keys":40,"buffer":52,"oMfpAn":55}],9:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var baseCopy = require('./baseCopy'),
    keys = require('../object/keys');

/**
 * The base implementation of `_.assign` without support for argument juggling,
 * multiple sources, and `customizer` functions.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @returns {Object} Returns `object`.
 */
function baseAssign(object, source) {
  return source == null
    ? object
    : baseCopy(source, keys(source), object);
}

module.exports = baseAssign;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/internal/baseAssign.js","/../../node_modules/card-validator/node_modules/lodash/internal")
},{"../object/keys":40,"./baseCopy":11,"buffer":52,"oMfpAn":55}],10:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var arrayCopy = require('./arrayCopy'),
    arrayEach = require('./arrayEach'),
    baseAssign = require('./baseAssign'),
    baseForOwn = require('./baseForOwn'),
    initCloneArray = require('./initCloneArray'),
    initCloneByTag = require('./initCloneByTag'),
    initCloneObject = require('./initCloneObject'),
    isArray = require('../lang/isArray'),
    isObject = require('../lang/isObject');

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    funcTag = '[object Function]',
    mapTag = '[object Map]',
    numberTag = '[object Number]',
    objectTag = '[object Object]',
    regexpTag = '[object RegExp]',
    setTag = '[object Set]',
    stringTag = '[object String]',
    weakMapTag = '[object WeakMap]';

var arrayBufferTag = '[object ArrayBuffer]',
    float32Tag = '[object Float32Array]',
    float64Tag = '[object Float64Array]',
    int8Tag = '[object Int8Array]',
    int16Tag = '[object Int16Array]',
    int32Tag = '[object Int32Array]',
    uint8Tag = '[object Uint8Array]',
    uint8ClampedTag = '[object Uint8ClampedArray]',
    uint16Tag = '[object Uint16Array]',
    uint32Tag = '[object Uint32Array]';

/** Used to identify `toStringTag` values supported by `_.clone`. */
var cloneableTags = {};
cloneableTags[argsTag] = cloneableTags[arrayTag] =
cloneableTags[arrayBufferTag] = cloneableTags[boolTag] =
cloneableTags[dateTag] = cloneableTags[float32Tag] =
cloneableTags[float64Tag] = cloneableTags[int8Tag] =
cloneableTags[int16Tag] = cloneableTags[int32Tag] =
cloneableTags[numberTag] = cloneableTags[objectTag] =
cloneableTags[regexpTag] = cloneableTags[stringTag] =
cloneableTags[uint8Tag] = cloneableTags[uint8ClampedTag] =
cloneableTags[uint16Tag] = cloneableTags[uint32Tag] = true;
cloneableTags[errorTag] = cloneableTags[funcTag] =
cloneableTags[mapTag] = cloneableTags[setTag] =
cloneableTags[weakMapTag] = false;

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/**
 * The base implementation of `_.clone` without support for argument juggling
 * and `this` binding `customizer` functions.
 *
 * @private
 * @param {*} value The value to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @param {Function} [customizer] The function to customize cloning values.
 * @param {string} [key] The key of `value`.
 * @param {Object} [object] The object `value` belongs to.
 * @param {Array} [stackA=[]] Tracks traversed source objects.
 * @param {Array} [stackB=[]] Associates clones with source counterparts.
 * @returns {*} Returns the cloned value.
 */
function baseClone(value, isDeep, customizer, key, object, stackA, stackB) {
  var result;
  if (customizer) {
    result = object ? customizer(value, key, object) : customizer(value);
  }
  if (result !== undefined) {
    return result;
  }
  if (!isObject(value)) {
    return value;
  }
  var isArr = isArray(value);
  if (isArr) {
    result = initCloneArray(value);
    if (!isDeep) {
      return arrayCopy(value, result);
    }
  } else {
    var tag = objToString.call(value),
        isFunc = tag == funcTag;

    if (tag == objectTag || tag == argsTag || (isFunc && !object)) {
      result = initCloneObject(isFunc ? {} : value);
      if (!isDeep) {
        return baseAssign(result, value);
      }
    } else {
      return cloneableTags[tag]
        ? initCloneByTag(value, tag, isDeep)
        : (object ? value : {});
    }
  }
  // Check for circular references and return its corresponding clone.
  stackA || (stackA = []);
  stackB || (stackB = []);

  var length = stackA.length;
  while (length--) {
    if (stackA[length] == value) {
      return stackB[length];
    }
  }
  // Add the source value to the stack of traversed objects and associate it with its clone.
  stackA.push(value);
  stackB.push(result);

  // Recursively populate clone (susceptible to call stack limits).
  (isArr ? arrayEach : baseForOwn)(value, function(subValue, key) {
    result[key] = baseClone(subValue, isDeep, customizer, key, value, stackA, stackB);
  });
  return result;
}

module.exports = baseClone;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/internal/baseClone.js","/../../node_modules/card-validator/node_modules/lodash/internal")
},{"../lang/isArray":33,"../lang/isObject":37,"./arrayCopy":6,"./arrayEach":7,"./baseAssign":9,"./baseForOwn":13,"./initCloneArray":21,"./initCloneByTag":22,"./initCloneObject":23,"buffer":52,"oMfpAn":55}],11:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * Copies properties of `source` to `object`.
 *
 * @private
 * @param {Object} source The object to copy properties from.
 * @param {Array} props The property names to copy.
 * @param {Object} [object={}] The object to copy properties to.
 * @returns {Object} Returns `object`.
 */
function baseCopy(source, props, object) {
  object || (object = {});

  var index = -1,
      length = props.length;

  while (++index < length) {
    var key = props[index];
    object[key] = source[key];
  }
  return object;
}

module.exports = baseCopy;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/internal/baseCopy.js","/../../node_modules/card-validator/node_modules/lodash/internal")
},{"buffer":52,"oMfpAn":55}],12:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var createBaseFor = require('./createBaseFor');

/**
 * The base implementation of `baseForIn` and `baseForOwn` which iterates
 * over `object` properties returned by `keysFunc` invoking `iteratee` for
 * each property. Iteratee functions may exit iteration early by explicitly
 * returning `false`.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @param {Function} keysFunc The function to get the keys of `object`.
 * @returns {Object} Returns `object`.
 */
var baseFor = createBaseFor();

module.exports = baseFor;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/internal/baseFor.js","/../../node_modules/card-validator/node_modules/lodash/internal")
},{"./createBaseFor":18,"buffer":52,"oMfpAn":55}],13:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var baseFor = require('./baseFor'),
    keys = require('../object/keys');

/**
 * The base implementation of `_.forOwn` without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Object} Returns `object`.
 */
function baseForOwn(object, iteratee) {
  return baseFor(object, iteratee, keys);
}

module.exports = baseForOwn;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/internal/baseForOwn.js","/../../node_modules/card-validator/node_modules/lodash/internal")
},{"../object/keys":40,"./baseFor":12,"buffer":52,"oMfpAn":55}],14:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

module.exports = baseProperty;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/internal/baseProperty.js","/../../node_modules/card-validator/node_modules/lodash/internal")
},{"buffer":52,"oMfpAn":55}],15:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var identity = require('../utility/identity');

/**
 * A specialized version of `baseCallback` which only supports `this` binding
 * and specifying the number of arguments to provide to `func`.
 *
 * @private
 * @param {Function} func The function to bind.
 * @param {*} thisArg The `this` binding of `func`.
 * @param {number} [argCount] The number of arguments to provide to `func`.
 * @returns {Function} Returns the callback.
 */
function bindCallback(func, thisArg, argCount) {
  if (typeof func != 'function') {
    return identity;
  }
  if (thisArg === undefined) {
    return func;
  }
  switch (argCount) {
    case 1: return function(value) {
      return func.call(thisArg, value);
    };
    case 3: return function(value, index, collection) {
      return func.call(thisArg, value, index, collection);
    };
    case 4: return function(accumulator, value, index, collection) {
      return func.call(thisArg, accumulator, value, index, collection);
    };
    case 5: return function(value, other, key, object, source) {
      return func.call(thisArg, value, other, key, object, source);
    };
  }
  return function() {
    return func.apply(thisArg, arguments);
  };
}

module.exports = bindCallback;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/internal/bindCallback.js","/../../node_modules/card-validator/node_modules/lodash/internal")
},{"../utility/identity":42,"buffer":52,"oMfpAn":55}],16:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/** Native method references. */
var ArrayBuffer = global.ArrayBuffer,
    Uint8Array = global.Uint8Array;

/**
 * Creates a clone of the given array buffer.
 *
 * @private
 * @param {ArrayBuffer} buffer The array buffer to clone.
 * @returns {ArrayBuffer} Returns the cloned array buffer.
 */
function bufferClone(buffer) {
  var result = new ArrayBuffer(buffer.byteLength),
      view = new Uint8Array(result);

  view.set(new Uint8Array(buffer));
  return result;
}

module.exports = bufferClone;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/internal/bufferClone.js","/../../node_modules/card-validator/node_modules/lodash/internal")
},{"buffer":52,"oMfpAn":55}],17:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var bindCallback = require('./bindCallback'),
    isIterateeCall = require('./isIterateeCall'),
    restParam = require('../function/restParam');

/**
 * Creates a `_.assign`, `_.defaults`, or `_.merge` function.
 *
 * @private
 * @param {Function} assigner The function to assign values.
 * @returns {Function} Returns the new assigner function.
 */
function createAssigner(assigner) {
  return restParam(function(object, sources) {
    var index = -1,
        length = object == null ? 0 : sources.length,
        customizer = length > 2 ? sources[length - 2] : undefined,
        guard = length > 2 ? sources[2] : undefined,
        thisArg = length > 1 ? sources[length - 1] : undefined;

    if (typeof customizer == 'function') {
      customizer = bindCallback(customizer, thisArg, 5);
      length -= 2;
    } else {
      customizer = typeof thisArg == 'function' ? thisArg : undefined;
      length -= (customizer ? 1 : 0);
    }
    if (guard && isIterateeCall(sources[0], sources[1], guard)) {
      customizer = length < 3 ? undefined : customizer;
      length = 1;
    }
    while (++index < length) {
      var source = sources[index];
      if (source) {
        assigner(object, source, customizer);
      }
    }
    return object;
  });
}

module.exports = createAssigner;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/internal/createAssigner.js","/../../node_modules/card-validator/node_modules/lodash/internal")
},{"../function/restParam":5,"./bindCallback":15,"./isIterateeCall":26,"buffer":52,"oMfpAn":55}],18:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var toObject = require('./toObject');

/**
 * Creates a base function for `_.forIn` or `_.forInRight`.
 *
 * @private
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Function} Returns the new base function.
 */
function createBaseFor(fromRight) {
  return function(object, iteratee, keysFunc) {
    var iterable = toObject(object),
        props = keysFunc(object),
        length = props.length,
        index = fromRight ? length : -1;

    while ((fromRight ? index-- : ++index < length)) {
      var key = props[index];
      if (iteratee(iterable[key], key, iterable) === false) {
        break;
      }
    }
    return object;
  };
}

module.exports = createBaseFor;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/internal/createBaseFor.js","/../../node_modules/card-validator/node_modules/lodash/internal")
},{"./toObject":30,"buffer":52,"oMfpAn":55}],19:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var baseProperty = require('./baseProperty');

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
 * that affects Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

module.exports = getLength;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/internal/getLength.js","/../../node_modules/card-validator/node_modules/lodash/internal")
},{"./baseProperty":14,"buffer":52,"oMfpAn":55}],20:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var isNative = require('../lang/isNative');

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = object == null ? undefined : object[key];
  return isNative(value) ? value : undefined;
}

module.exports = getNative;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/internal/getNative.js","/../../node_modules/card-validator/node_modules/lodash/internal")
},{"../lang/isNative":35,"buffer":52,"oMfpAn":55}],21:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Initializes an array clone.
 *
 * @private
 * @param {Array} array The array to clone.
 * @returns {Array} Returns the initialized clone.
 */
function initCloneArray(array) {
  var length = array.length,
      result = new array.constructor(length);

  // Add array properties assigned by `RegExp#exec`.
  if (length && typeof array[0] == 'string' && hasOwnProperty.call(array, 'index')) {
    result.index = array.index;
    result.input = array.input;
  }
  return result;
}

module.exports = initCloneArray;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/internal/initCloneArray.js","/../../node_modules/card-validator/node_modules/lodash/internal")
},{"buffer":52,"oMfpAn":55}],22:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var bufferClone = require('./bufferClone');

/** `Object#toString` result references. */
var boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    numberTag = '[object Number]',
    regexpTag = '[object RegExp]',
    stringTag = '[object String]';

var arrayBufferTag = '[object ArrayBuffer]',
    float32Tag = '[object Float32Array]',
    float64Tag = '[object Float64Array]',
    int8Tag = '[object Int8Array]',
    int16Tag = '[object Int16Array]',
    int32Tag = '[object Int32Array]',
    uint8Tag = '[object Uint8Array]',
    uint8ClampedTag = '[object Uint8ClampedArray]',
    uint16Tag = '[object Uint16Array]',
    uint32Tag = '[object Uint32Array]';

/** Used to match `RegExp` flags from their coerced string values. */
var reFlags = /\w*$/;

/**
 * Initializes an object clone based on its `toStringTag`.
 *
 * **Note:** This function only supports cloning values with tags of
 * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
 *
 * @private
 * @param {Object} object The object to clone.
 * @param {string} tag The `toStringTag` of the object to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @returns {Object} Returns the initialized clone.
 */
function initCloneByTag(object, tag, isDeep) {
  var Ctor = object.constructor;
  switch (tag) {
    case arrayBufferTag:
      return bufferClone(object);

    case boolTag:
    case dateTag:
      return new Ctor(+object);

    case float32Tag: case float64Tag:
    case int8Tag: case int16Tag: case int32Tag:
    case uint8Tag: case uint8ClampedTag: case uint16Tag: case uint32Tag:
      var buffer = object.buffer;
      return new Ctor(isDeep ? bufferClone(buffer) : buffer, object.byteOffset, object.length);

    case numberTag:
    case stringTag:
      return new Ctor(object);

    case regexpTag:
      var result = new Ctor(object.source, reFlags.exec(object));
      result.lastIndex = object.lastIndex;
  }
  return result;
}

module.exports = initCloneByTag;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/internal/initCloneByTag.js","/../../node_modules/card-validator/node_modules/lodash/internal")
},{"./bufferClone":16,"buffer":52,"oMfpAn":55}],23:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * Initializes an object clone.
 *
 * @private
 * @param {Object} object The object to clone.
 * @returns {Object} Returns the initialized clone.
 */
function initCloneObject(object) {
  var Ctor = object.constructor;
  if (!(typeof Ctor == 'function' && Ctor instanceof Ctor)) {
    Ctor = Object;
  }
  return new Ctor;
}

module.exports = initCloneObject;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/internal/initCloneObject.js","/../../node_modules/card-validator/node_modules/lodash/internal")
},{"buffer":52,"oMfpAn":55}],24:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var getLength = require('./getLength'),
    isLength = require('./isLength');

/**
 * Checks if `value` is array-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 */
function isArrayLike(value) {
  return value != null && isLength(getLength(value));
}

module.exports = isArrayLike;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/internal/isArrayLike.js","/../../node_modules/card-validator/node_modules/lodash/internal")
},{"./getLength":19,"./isLength":27,"buffer":52,"oMfpAn":55}],25:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/** Used to detect unsigned integer values. */
var reIsUint = /^\d+$/;

/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  value = (typeof value == 'number' || reIsUint.test(value)) ? +value : -1;
  length = length == null ? MAX_SAFE_INTEGER : length;
  return value > -1 && value % 1 == 0 && value < length;
}

module.exports = isIndex;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/internal/isIndex.js","/../../node_modules/card-validator/node_modules/lodash/internal")
},{"buffer":52,"oMfpAn":55}],26:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var isArrayLike = require('./isArrayLike'),
    isIndex = require('./isIndex'),
    isObject = require('../lang/isObject');

/**
 * Checks if the provided arguments are from an iteratee call.
 *
 * @private
 * @param {*} value The potential iteratee value argument.
 * @param {*} index The potential iteratee index or key argument.
 * @param {*} object The potential iteratee object argument.
 * @returns {boolean} Returns `true` if the arguments are from an iteratee call, else `false`.
 */
function isIterateeCall(value, index, object) {
  if (!isObject(object)) {
    return false;
  }
  var type = typeof index;
  if (type == 'number'
      ? (isArrayLike(object) && isIndex(index, object.length))
      : (type == 'string' && index in object)) {
    var other = object[index];
    return value === value ? (value === other) : (other !== other);
  }
  return false;
}

module.exports = isIterateeCall;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/internal/isIterateeCall.js","/../../node_modules/card-validator/node_modules/lodash/internal")
},{"../lang/isObject":37,"./isArrayLike":24,"./isIndex":25,"buffer":52,"oMfpAn":55}],27:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

module.exports = isLength;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/internal/isLength.js","/../../node_modules/card-validator/node_modules/lodash/internal")
},{"buffer":52,"oMfpAn":55}],28:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

module.exports = isObjectLike;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/internal/isObjectLike.js","/../../node_modules/card-validator/node_modules/lodash/internal")
},{"buffer":52,"oMfpAn":55}],29:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var isArguments = require('../lang/isArguments'),
    isArray = require('../lang/isArray'),
    isIndex = require('./isIndex'),
    isLength = require('./isLength'),
    keysIn = require('../object/keysIn');

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * A fallback implementation of `Object.keys` which creates an array of the
 * own enumerable property names of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function shimKeys(object) {
  var props = keysIn(object),
      propsLength = props.length,
      length = propsLength && object.length;

  var allowIndexes = !!length && isLength(length) &&
    (isArray(object) || isArguments(object));

  var index = -1,
      result = [];

  while (++index < propsLength) {
    var key = props[index];
    if ((allowIndexes && isIndex(key, length)) || hasOwnProperty.call(object, key)) {
      result.push(key);
    }
  }
  return result;
}

module.exports = shimKeys;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/internal/shimKeys.js","/../../node_modules/card-validator/node_modules/lodash/internal")
},{"../lang/isArguments":32,"../lang/isArray":33,"../object/keysIn":41,"./isIndex":25,"./isLength":27,"buffer":52,"oMfpAn":55}],30:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var isObject = require('../lang/isObject');

/**
 * Converts `value` to an object if it's not one.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {Object} Returns the object.
 */
function toObject(value) {
  return isObject(value) ? value : Object(value);
}

module.exports = toObject;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/internal/toObject.js","/../../node_modules/card-validator/node_modules/lodash/internal")
},{"../lang/isObject":37,"buffer":52,"oMfpAn":55}],31:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var baseClone = require('../internal/baseClone'),
    bindCallback = require('../internal/bindCallback');

/**
 * Creates a deep clone of `value`. If `customizer` is provided it's invoked
 * to produce the cloned values. If `customizer` returns `undefined` cloning
 * is handled by the method instead. The `customizer` is bound to `thisArg`
 * and invoked with up to three argument; (value [, index|key, object]).
 *
 * **Note:** This method is loosely based on the
 * [structured clone algorithm](http://www.w3.org/TR/html5/infrastructure.html#internal-structured-cloning-algorithm).
 * The enumerable properties of `arguments` objects and objects created by
 * constructors other than `Object` are cloned to plain `Object` objects. An
 * empty object is returned for uncloneable values such as functions, DOM nodes,
 * Maps, Sets, and WeakMaps.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to deep clone.
 * @param {Function} [customizer] The function to customize cloning values.
 * @param {*} [thisArg] The `this` binding of `customizer`.
 * @returns {*} Returns the deep cloned value.
 * @example
 *
 * var users = [
 *   { 'user': 'barney' },
 *   { 'user': 'fred' }
 * ];
 *
 * var deep = _.cloneDeep(users);
 * deep[0] === users[0];
 * // => false
 *
 * // using a customizer callback
 * var el = _.cloneDeep(document.body, function(value) {
 *   if (_.isElement(value)) {
 *     return value.cloneNode(true);
 *   }
 * });
 *
 * el === document.body
 * // => false
 * el.nodeName
 * // => BODY
 * el.childNodes.length;
 * // => 20
 */
function cloneDeep(value, customizer, thisArg) {
  return typeof customizer == 'function'
    ? baseClone(value, true, bindCallback(customizer, thisArg, 3))
    : baseClone(value, true);
}

module.exports = cloneDeep;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/lang/cloneDeep.js","/../../node_modules/card-validator/node_modules/lodash/lang")
},{"../internal/baseClone":10,"../internal/bindCallback":15,"buffer":52,"oMfpAn":55}],32:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var isArrayLike = require('../internal/isArrayLike'),
    isObjectLike = require('../internal/isObjectLike');

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Native method references. */
var propertyIsEnumerable = objectProto.propertyIsEnumerable;

/**
 * Checks if `value` is classified as an `arguments` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
function isArguments(value) {
  return isObjectLike(value) && isArrayLike(value) &&
    hasOwnProperty.call(value, 'callee') && !propertyIsEnumerable.call(value, 'callee');
}

module.exports = isArguments;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/lang/isArguments.js","/../../node_modules/card-validator/node_modules/lodash/lang")
},{"../internal/isArrayLike":24,"../internal/isObjectLike":28,"buffer":52,"oMfpAn":55}],33:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var getNative = require('../internal/getNative'),
    isLength = require('../internal/isLength'),
    isObjectLike = require('../internal/isObjectLike');

/** `Object#toString` result references. */
var arrayTag = '[object Array]';

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/* Native method references for those with the same name as other `lodash` methods. */
var nativeIsArray = getNative(Array, 'isArray');

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(function() { return arguments; }());
 * // => false
 */
var isArray = nativeIsArray || function(value) {
  return isObjectLike(value) && isLength(value.length) && objToString.call(value) == arrayTag;
};

module.exports = isArray;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/lang/isArray.js","/../../node_modules/card-validator/node_modules/lodash/lang")
},{"../internal/getNative":20,"../internal/isLength":27,"../internal/isObjectLike":28,"buffer":52,"oMfpAn":55}],34:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var isObject = require('./isObject');

/** `Object#toString` result references. */
var funcTag = '[object Function]';

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in older versions of Chrome and Safari which return 'function' for regexes
  // and Safari 8 which returns 'object' for typed array constructors.
  return isObject(value) && objToString.call(value) == funcTag;
}

module.exports = isFunction;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/lang/isFunction.js","/../../node_modules/card-validator/node_modules/lodash/lang")
},{"./isObject":37,"buffer":52,"oMfpAn":55}],35:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var isFunction = require('./isFunction'),
    isObjectLike = require('../internal/isObjectLike');

/** Used to detect host constructors (Safari > 5). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var fnToString = Function.prototype.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  fnToString.call(hasOwnProperty).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/**
 * Checks if `value` is a native function.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function, else `false`.
 * @example
 *
 * _.isNative(Array.prototype.push);
 * // => true
 *
 * _.isNative(_);
 * // => false
 */
function isNative(value) {
  if (value == null) {
    return false;
  }
  if (isFunction(value)) {
    return reIsNative.test(fnToString.call(value));
  }
  return isObjectLike(value) && reIsHostCtor.test(value);
}

module.exports = isNative;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/lang/isNative.js","/../../node_modules/card-validator/node_modules/lodash/lang")
},{"../internal/isObjectLike":28,"./isFunction":34,"buffer":52,"oMfpAn":55}],36:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var isObjectLike = require('../internal/isObjectLike');

/** `Object#toString` result references. */
var numberTag = '[object Number]';

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/**
 * Checks if `value` is classified as a `Number` primitive or object.
 *
 * **Note:** To exclude `Infinity`, `-Infinity`, and `NaN`, which are classified
 * as numbers, use the `_.isFinite` method.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isNumber(8.4);
 * // => true
 *
 * _.isNumber(NaN);
 * // => true
 *
 * _.isNumber('8.4');
 * // => false
 */
function isNumber(value) {
  return typeof value == 'number' || (isObjectLike(value) && objToString.call(value) == numberTag);
}

module.exports = isNumber;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/lang/isNumber.js","/../../node_modules/card-validator/node_modules/lodash/lang")
},{"../internal/isObjectLike":28,"buffer":52,"oMfpAn":55}],37:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

module.exports = isObject;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/lang/isObject.js","/../../node_modules/card-validator/node_modules/lodash/lang")
},{"buffer":52,"oMfpAn":55}],38:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var isObjectLike = require('../internal/isObjectLike');

/** `Object#toString` result references. */
var stringTag = '[object String]';

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/**
 * Checks if `value` is classified as a `String` primitive or object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isString('abc');
 * // => true
 *
 * _.isString(1);
 * // => false
 */
function isString(value) {
  return typeof value == 'string' || (isObjectLike(value) && objToString.call(value) == stringTag);
}

module.exports = isString;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/lang/isString.js","/../../node_modules/card-validator/node_modules/lodash/lang")
},{"../internal/isObjectLike":28,"buffer":52,"oMfpAn":55}],39:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var assignWith = require('../internal/assignWith'),
    baseAssign = require('../internal/baseAssign'),
    createAssigner = require('../internal/createAssigner');

/**
 * Assigns own enumerable properties of source object(s) to the destination
 * object. Subsequent sources overwrite property assignments of previous sources.
 * If `customizer` is provided it's invoked to produce the assigned values.
 * The `customizer` is bound to `thisArg` and invoked with five arguments:
 * (objectValue, sourceValue, key, object, source).
 *
 * **Note:** This method mutates `object` and is based on
 * [`Object.assign`](http://ecma-international.org/ecma-262/6.0/#sec-object.assign).
 *
 * @static
 * @memberOf _
 * @alias extend
 * @category Object
 * @param {Object} object The destination object.
 * @param {...Object} [sources] The source objects.
 * @param {Function} [customizer] The function to customize assigned values.
 * @param {*} [thisArg] The `this` binding of `customizer`.
 * @returns {Object} Returns `object`.
 * @example
 *
 * _.assign({ 'user': 'barney' }, { 'age': 40 }, { 'user': 'fred' });
 * // => { 'user': 'fred', 'age': 40 }
 *
 * // using a customizer callback
 * var defaults = _.partialRight(_.assign, function(value, other) {
 *   return _.isUndefined(value) ? other : value;
 * });
 *
 * defaults({ 'user': 'barney' }, { 'age': 36 }, { 'user': 'fred' });
 * // => { 'user': 'barney', 'age': 36 }
 */
var assign = createAssigner(function(object, source, customizer) {
  return customizer
    ? assignWith(object, source, customizer)
    : baseAssign(object, source);
});

module.exports = assign;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/object/assign.js","/../../node_modules/card-validator/node_modules/lodash/object")
},{"../internal/assignWith":8,"../internal/baseAssign":9,"../internal/createAssigner":17,"buffer":52,"oMfpAn":55}],40:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var getNative = require('../internal/getNative'),
    isArrayLike = require('../internal/isArrayLike'),
    isObject = require('../lang/isObject'),
    shimKeys = require('../internal/shimKeys');

/* Native method references for those with the same name as other `lodash` methods. */
var nativeKeys = getNative(Object, 'keys');

/**
 * Creates an array of the own enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects. See the
 * [ES spec](http://ecma-international.org/ecma-262/6.0/#sec-object.keys)
 * for more details.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keys(new Foo);
 * // => ['a', 'b'] (iteration order is not guaranteed)
 *
 * _.keys('hi');
 * // => ['0', '1']
 */
var keys = !nativeKeys ? shimKeys : function(object) {
  var Ctor = object == null ? undefined : object.constructor;
  if ((typeof Ctor == 'function' && Ctor.prototype === object) ||
      (typeof object != 'function' && isArrayLike(object))) {
    return shimKeys(object);
  }
  return isObject(object) ? nativeKeys(object) : [];
};

module.exports = keys;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/object/keys.js","/../../node_modules/card-validator/node_modules/lodash/object")
},{"../internal/getNative":20,"../internal/isArrayLike":24,"../internal/shimKeys":29,"../lang/isObject":37,"buffer":52,"oMfpAn":55}],41:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var isArguments = require('../lang/isArguments'),
    isArray = require('../lang/isArray'),
    isIndex = require('../internal/isIndex'),
    isLength = require('../internal/isLength'),
    isObject = require('../lang/isObject');

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Creates an array of the own and inherited enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keysIn(new Foo);
 * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
 */
function keysIn(object) {
  if (object == null) {
    return [];
  }
  if (!isObject(object)) {
    object = Object(object);
  }
  var length = object.length;
  length = (length && isLength(length) &&
    (isArray(object) || isArguments(object)) && length) || 0;

  var Ctor = object.constructor,
      index = -1,
      isProto = typeof Ctor == 'function' && Ctor.prototype === object,
      result = Array(length),
      skipIndexes = length > 0;

  while (++index < length) {
    result[index] = (index + '');
  }
  for (var key in object) {
    if (!(skipIndexes && isIndex(key, length)) &&
        !(key == 'constructor' && (isProto || !hasOwnProperty.call(object, key)))) {
      result.push(key);
    }
  }
  return result;
}

module.exports = keysIn;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/object/keysIn.js","/../../node_modules/card-validator/node_modules/lodash/object")
},{"../internal/isIndex":25,"../internal/isLength":27,"../lang/isArguments":32,"../lang/isArray":33,"../lang/isObject":37,"buffer":52,"oMfpAn":55}],42:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * This method returns the first argument provided to it.
 *
 * @static
 * @memberOf _
 * @category Utility
 * @param {*} value Any value.
 * @returns {*} Returns `value`.
 * @example
 *
 * var object = { 'user': 'fred' };
 *
 * _.identity(object) === object;
 * // => true
 */
function identity(value) {
  return value;
}

module.exports = identity;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/node_modules/lodash/utility/identity.js","/../../node_modules/card-validator/node_modules/lodash/utility")
},{"buffer":52,"oMfpAn":55}],43:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var isString = require('lodash/lang/isString');
var extend = require('lodash/object/assign');
var luhn10 = require('./luhn-10');
var getCardTypes = require('credit-card-type');
var isNumber = require('lodash/lang/isNumber');

function verification(card, isPotentiallyValid, isValid) {
  return extend({}, {card: card, isPotentiallyValid: isPotentiallyValid, isValid: isValid});
}

function cardNumber(value) {
  var potentialTypes, cardType, valid, i, maxLength;

  if (isNumber(value)) {
    value = String(value);
  }

  if (!isString(value)) { return verification(null, false, false); }

  value = value.replace(/\-|\s/g, '');

  if (!/^\d*$/.test(value)) { return verification(null, false, false); }

  potentialTypes = getCardTypes(value);

  if (potentialTypes.length === 0) {
    return verification(null, false, false);
  } else if (potentialTypes.length !== 1) {
    return verification(null, true, false);
  }

  cardType = potentialTypes[0];

  if (cardType.type === 'unionpay') {  // UnionPay is not Luhn 10 compliant
    valid = true;
  } else {
    valid = luhn10(value);
  }

  for (i = 0; i < cardType.lengths.length; i++) {
    if (cardType.lengths[i] === value.length) {
      return verification(cardType, valid, valid);
    }
  }

  maxLength = Math.max.apply(null, cardType.lengths);

  if (value.length < maxLength) {
    return verification(cardType, true, false);
  }

  return verification(cardType, false, false);
}

module.exports = cardNumber;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/src/card-number.js","/../../node_modules/card-validator/src")
},{"./luhn-10":48,"buffer":52,"credit-card-type":4,"lodash/lang/isNumber":36,"lodash/lang/isString":38,"lodash/object/assign":39,"oMfpAn":55}],44:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var isString = require('lodash/lang/isString');
var DEFAULT_LENGTH = 3;

function includes(array, thing) {
  var i = 0;

  for (; i < array.length; i++) {
    if (thing === array[i]) { return true; }
  }

  return false;
}

function min(array) {
  var minimum = DEFAULT_LENGTH;
  var i = 0;

  for (; i < array.length; i++) {
    minimum = array[i] < minimum ? array[i] : minimum;
  }

  return minimum;
}

function max(array) {
  var maximum = DEFAULT_LENGTH;
  var i = 0;

  for (; i < array.length; i++) {
    maximum = array[i] > maximum ? array[i] : maximum;
  }

  return maximum;
}

function verification(isValid, isPotentiallyValid) {
  return {isValid: isValid, isPotentiallyValid: isPotentiallyValid};
}

function cvv(value, maxLength) {
  maxLength = maxLength || DEFAULT_LENGTH;
  maxLength = maxLength instanceof Array ? maxLength : [maxLength];

  if (!isString(value)) { return verification(false, false); }
  if (!/^\d*$/.test(value)) { return verification(false, false); }
  if (includes(maxLength, value.length)) { return verification(true, true); }
  if (value.length < min(maxLength)) { return verification(false, true); }
  if (value.length > max(maxLength)) { return verification(false, false); }

  return verification(true, true);
}

module.exports = cvv;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/src/cvv.js","/../../node_modules/card-validator/src")
},{"buffer":52,"lodash/lang/isString":38,"oMfpAn":55}],45:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var parseDate = require('./parse-date');
var expirationMonth = require('./expiration-month');
var expirationYear = require('./expiration-year');
var isString = require('lodash/lang/isString');

function verification(isValid, isPotentiallyValid, month, year) {
  return {
    isValid: isValid,
    isPotentiallyValid: isPotentiallyValid,
    month: month,
    year: year
  };
}

function expirationDate(value) {
  var date, monthValid, yearValid, isValidForThisYear;

  if (!isString(value)) {
    return verification(false, false, null, null);
  }

  value = value.replace(/^(\d\d) (\d\d(\d\d)?)$/, '$1/$2');
  date = parseDate(value);
  monthValid = expirationMonth(date.month);
  yearValid = expirationYear(date.year);

  if (yearValid.isValid) {
    if (yearValid.isCurrentYear) {
      isValidForThisYear = monthValid.isValidForThisYear;
      return verification(isValidForThisYear, isValidForThisYear, date.month, date.year);
    }

    if (monthValid.isValid) {
      return verification(true, true, date.month, date.year);
    }
  }

  if (monthValid.isPotentiallyValid && yearValid.isPotentiallyValid) {
    return verification(false, true, null, null);
  }

  return verification(false, false, null, null);
}

module.exports = expirationDate;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/src/expiration-date.js","/../../node_modules/card-validator/src")
},{"./expiration-month":46,"./expiration-year":47,"./parse-date":49,"buffer":52,"lodash/lang/isString":38,"oMfpAn":55}],46:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var isString = require('lodash/lang/isString');

function verification(isValid, isPotentiallyValid, isValidForThisYear) {
  return {
    isValid: isValid,
    isPotentiallyValid: isPotentiallyValid,
    isValidForThisYear: isValidForThisYear || false
  };
}

function expirationMonth(value) {
  var month, result;
  var currentMonth = new Date().getMonth() + 1;

  if (!isString(value)) {
    return verification(false, false);
  }
  if ((value.replace(/\s/g, '') === '') || (value === '0')) {
    return verification(false, true);
  }
  if (!/^\d*$/.test(value)) {
    return verification(false, false);
  }

  month = parseInt(value, 10);

  if (isNaN(value)) {
    return verification(false, false);
  }

  result = month > 0 && month < 13;

  return verification(result, result, result && month >= currentMonth);
}

module.exports = expirationMonth;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/src/expiration-month.js","/../../node_modules/card-validator/src")
},{"buffer":52,"lodash/lang/isString":38,"oMfpAn":55}],47:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var isString = require('lodash/lang/isString');
var maxYear = 19;

function verification(isValid, isPotentiallyValid, isCurrentYear) {
  return {
    isValid: isValid,
    isPotentiallyValid: isPotentiallyValid,
    isCurrentYear: isCurrentYear || false
  };
}

function expirationYear(value) {
  var currentFirstTwo, currentYear, firstTwo, len, twoDigitYear, valid, isCurrentYear;

  if (!isString(value)) {
    return verification(false, false);
  }
  if (value.replace(/\s/g, '') === '') {
    return verification(false, true);
  }
  if (!/^\d*$/.test(value)) {
    return verification(false, false);
  }

  len = value.length;

  if (len < 2) {
    return verification(false, true);
  }

  currentYear = new Date().getFullYear();

  if (len === 3) {
    // 20x === 20x
    firstTwo = value.slice(0, 2);
    currentFirstTwo = String(currentYear).slice(0, 2);
    return verification(false, firstTwo === currentFirstTwo);
  }

  if (len > 4) {
    return verification(false, false);
  }

  value = parseInt(value, 10);
  twoDigitYear = Number(String(currentYear).substr(2, 2));

  if (len === 2) {
    isCurrentYear = twoDigitYear === value;
    valid = value >= twoDigitYear && value <= twoDigitYear + maxYear;
  } else if (len === 4) {
    isCurrentYear = currentYear === value;
    valid = value >= currentYear && value <= currentYear + maxYear;
  }

  return verification(valid, valid, isCurrentYear);
}

module.exports = expirationYear;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/src/expiration-year.js","/../../node_modules/card-validator/src")
},{"buffer":52,"lodash/lang/isString":38,"oMfpAn":55}],48:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/*eslint-disable*/
module.exports = function luhn10(a,b,c,d,e) {
  for(d = +a[b = a.length-1], e=0; b--;)
  c = +a[b], d += ++e % 2 ? 2 * c % 10 + (c > 4) : c;
  return !(d%10)
};

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/src/luhn-10.js","/../../node_modules/card-validator/src")
},{"buffer":52,"oMfpAn":55}],49:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
function parseDate(value) {
  var month, len;

  if (value.match('/')) {
    value = value.split(/\s*\/\s*/g);

    return {
      month: value[0],
      year: value.slice(1).join()
    };
  }

  len = value[0] === '0' || value.length > 5 || value.length === 4 || value.length === 3 ? 2 : 1;
  month = value.substr(0, len);

  return {
    month: month,
    year: value.substr(month.length, 4)
  };
}

module.exports = parseDate;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/src/parse-date.js","/../../node_modules/card-validator/src")
},{"buffer":52,"oMfpAn":55}],50:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var isString = require('lodash/lang/isString');

function verification(isValid, isPotentiallyValid) {
  return {isValid: isValid, isPotentiallyValid: isPotentiallyValid};
}

function postalCode(value) {
  if (!isString(value)) {
    return verification(false, false);
  } else if (value.length < 4) {
    return verification(false, true);
  }

  return verification(true, true);
}

module.exports = postalCode;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/card-validator/src/postal-code.js","/../../node_modules/card-validator/src")
},{"buffer":52,"lodash/lang/isString":38,"oMfpAn":55}],51:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var hasOwn = Object.prototype.hasOwnProperty;
var toStr = Object.prototype.toString;

var isArray = function isArray(arr) {
  if (typeof Array.isArray === 'function') {
    return Array.isArray(arr);
  }

  return toStr.call(arr) === '[object Array]';
};

var isPlainObject = function isPlainObject(obj) {
  if (!obj || toStr.call(obj) !== '[object Object]') {
    return false;
  }

  var hasOwnConstructor = hasOwn.call(obj, 'constructor');
  var hasIsPrototypeOf = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
  // Not own constructor property must be Object
  if (obj.constructor && !hasOwnConstructor && !hasIsPrototypeOf) {
    return false;
  }

  // Own properties are enumerated firstly, so to speed up,
  // if last one is own, then all properties are own.
  var key;
  for (key in obj) {/**/}

  return typeof key === 'undefined' || hasOwn.call(obj, key);
};

module.exports = function extend() {
  var options, name, src, copy, copyIsArray, clone,
    target = arguments[0],
    i = 1,
    length = arguments.length,
    deep = false;

  // Handle a deep copy situation
  if (typeof target === 'boolean') {
    deep = target;
    target = arguments[1] || {};
    // skip the boolean and the target
    i = 2;
  } else if ((typeof target !== 'object' && typeof target !== 'function') || target == null) {
    target = {};
  }

  for (; i < length; ++i) {
    options = arguments[i];
    // Only deal with non-null/undefined values
    if (options != null) {
      // Extend the base object
      for (name in options) {
        src = target[name];
        copy = options[name];

        // Prevent never-ending loop
        if (target !== copy) {
          // Recurse if we're merging plain objects or arrays
          if (deep && copy && (isPlainObject(copy) || (copyIsArray = isArray(copy)))) {
            if (copyIsArray) {
              copyIsArray = false;
              clone = src && isArray(src) ? src : [];
            } else {
              clone = src && isPlainObject(src) ? src : {};
            }

            // Never move original objects, clone them
            target[name] = extend(deep, clone, copy);

          // Don't bring in undefined values
          } else if (typeof copy !== 'undefined') {
            target[name] = copy;
          }
        }
      }
    }
  }

  // Return the modified object
  return target;
};


}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/extend/index.js","/../../node_modules/extend")
},{"buffer":52,"oMfpAn":55}],52:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `Buffer._useTypedArrays`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (compatible down to IE6)
 */
Buffer._useTypedArrays = (function () {
  // Detect if browser supports Typed Arrays. Supported browsers are IE 10+, Firefox 4+,
  // Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+. If the browser does not support adding
  // properties to `Uint8Array` instances, then that's the same as no `Uint8Array` support
  // because we need to be able to add all the node Buffer API methods. This is an issue
  // in Firefox 4-29. Now fixed: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() &&
        typeof arr.subarray === 'function' // Chrome 9-10 lack `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Workaround: node's base64 implementation allows for non-padded strings
  // while base64-js does not.
  if (encoding === 'base64' && type === 'string') {
    subject = stringtrim(subject)
    while (subject.length % 4 !== 0) {
      subject = subject + '='
    }
  }

  // Find the length
  var length
  if (type === 'number')
    length = coerce(subject)
  else if (type === 'string')
    length = Buffer.byteLength(subject, encoding)
  else if (type === 'object')
    length = coerce(subject.length) // assume that object is array-like
  else
    throw new Error('First argument needs to be a number, array or string.')

  var buf
  if (Buffer._useTypedArrays) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer._useTypedArrays && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    for (i = 0; i < length; i++) {
      if (Buffer.isBuffer(subject))
        buf[i] = subject.readUInt8(i)
      else
        buf[i] = subject[i]
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer._useTypedArrays && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
  return !!(b !== null && b !== undefined && b._isBuffer)
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'hex':
      ret = str.length / 2
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.concat = function (list, totalLength) {
  assert(isArray(list), 'Usage: Buffer.concat(list, [totalLength])\n' +
      'list should be an Array.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (typeof totalLength !== 'number') {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

// BUFFER INSTANCE METHODS
// =======================

function _hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  assert(strLen % 2 === 0, 'Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    assert(!isNaN(byte), 'Invalid hex string')
    buf[offset + i] = byte
  }
  Buffer._charsWritten = i * 2
  return i
}

function _utf8Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function _asciiWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function _binaryWrite (buf, string, offset, length) {
  return _asciiWrite(buf, string, offset, length)
}

function _base64Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function _utf16leWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = _asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = _binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = _base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leWrite(this, string, offset, length)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end !== undefined)
    ? Number(end)
    : end = self.length

  // Fastpath empty strings
  if (end === start)
    return ''

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexSlice(self, start, end)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Slice(self, start, end)
      break
    case 'ascii':
      ret = _asciiSlice(self, start, end)
      break
    case 'binary':
      ret = _binarySlice(self, start, end)
      break
    case 'base64':
      ret = _base64Slice(self, start, end)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leSlice(self, start, end)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  assert(end >= start, 'sourceEnd < sourceStart')
  assert(target_start >= 0 && target_start < target.length,
      'targetStart out of bounds')
  assert(start >= 0 && start < source.length, 'sourceStart out of bounds')
  assert(end >= 0 && end <= source.length, 'sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 100 || !Buffer._useTypedArrays) {
    for (var i = 0; i < len; i++)
      target[i + target_start] = this[i + start]
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

function _base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function _utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function _asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++)
    ret += String.fromCharCode(buf[i])
  return ret
}

function _binarySlice (buf, start, end) {
  return _asciiSlice(buf, start, end)
}

function _hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function _utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i+1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = clamp(start, len, 0)
  end = clamp(end, len, len)

  if (Buffer._useTypedArrays) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  return this[offset]
}

function _readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    val = buf[offset]
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
  } else {
    val = buf[offset] << 8
    if (offset + 1 < len)
      val |= buf[offset + 1]
  }
  return val
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return _readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return _readUInt16(this, offset, false, noAssert)
}

function _readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    if (offset + 2 < len)
      val = buf[offset + 2] << 16
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
    val |= buf[offset]
    if (offset + 3 < len)
      val = val + (buf[offset + 3] << 24 >>> 0)
  } else {
    if (offset + 1 < len)
      val = buf[offset + 1] << 16
    if (offset + 2 < len)
      val |= buf[offset + 2] << 8
    if (offset + 3 < len)
      val |= buf[offset + 3]
    val = val + (buf[offset] << 24 >>> 0)
  }
  return val
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return _readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return _readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  var neg = this[offset] & 0x80
  if (neg)
    return (0xff - this[offset] + 1) * -1
  else
    return this[offset]
}

function _readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt16(buf, offset, littleEndian, true)
  var neg = val & 0x8000
  if (neg)
    return (0xffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return _readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return _readInt16(this, offset, false, noAssert)
}

function _readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt32(buf, offset, littleEndian, true)
  var neg = val & 0x80000000
  if (neg)
    return (0xffffffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return _readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return _readInt32(this, offset, false, noAssert)
}

function _readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 23, 4)
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return _readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return _readFloat(this, offset, false, noAssert)
}

function _readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 52, 8)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return _readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return _readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= this.length) return

  this[offset] = value
}

function _writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
    buf[offset + i] =
        (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
            (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, false, noAssert)
}

function _writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 4); i < j; i++) {
    buf[offset + i] =
        (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= this.length)
    return

  if (value >= 0)
    this.writeUInt8(value, offset, noAssert)
  else
    this.writeUInt8(0xff + value + 1, offset, noAssert)
}

function _writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt16(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, false, noAssert)
}

function _writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt32(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, false, noAssert)
}

function _writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 23, 4)
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, false, noAssert)
}

function _writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 52, 8)
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (typeof value === 'string') {
    value = value.charCodeAt(0)
  }

  assert(typeof value === 'number' && !isNaN(value), 'value is not a number')
  assert(end >= start, 'end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  assert(start >= 0 && start < this.length, 'start out of bounds')
  assert(end >= 0 && end <= this.length, 'end out of bounds')

  for (var i = start; i < end; i++) {
    this[i] = value
  }
}

Buffer.prototype.inspect = function () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer._useTypedArrays) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1)
        buf[i] = this[i]
      return buf.buffer
    }
  } else {
    throw new Error('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

// slice(start, end)
function clamp (index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len
  if (index >= 0) return index
  index += len
  if (index >= 0) return index
  return 0
}

function coerce (length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length)
  return length < 0 ? 0 : length
}

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F)
      byteArray.push(str.charCodeAt(i))
    else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16))
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  var pos
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 */
function verifuint (value, max) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value >= 0, 'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754 (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/index.js","/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer")
},{"base64-js":53,"buffer":52,"ieee754":54,"oMfpAn":55}],53:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
  'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

  var PLUS   = '+'.charCodeAt(0)
  var SLASH  = '/'.charCodeAt(0)
  var NUMBER = '0'.charCodeAt(0)
  var LOWER  = 'a'.charCodeAt(0)
  var UPPER  = 'A'.charCodeAt(0)
  var PLUS_URL_SAFE = '-'.charCodeAt(0)
  var SLASH_URL_SAFE = '_'.charCodeAt(0)

  function decode (elt) {
    var code = elt.charCodeAt(0)
    if (code === PLUS ||
        code === PLUS_URL_SAFE)
      return 62 // '+'
    if (code === SLASH ||
        code === SLASH_URL_SAFE)
      return 63 // '/'
    if (code < NUMBER)
      return -1 //no match
    if (code < NUMBER + 10)
      return code - NUMBER + 26 + 26
    if (code < UPPER + 26)
      return code - UPPER
    if (code < LOWER + 26)
      return code - LOWER + 26
  }

  function b64ToByteArray (b64) {
    var i, j, l, tmp, placeHolders, arr

    if (b64.length % 4 > 0) {
      throw new Error('Invalid string. Length must be a multiple of 4')
    }

    // the number of equal signs (place holders)
    // if there are two placeholders, than the two characters before it
    // represent one byte
    // if there is only one, then the three characters before it represent 2 bytes
    // this is just a cheap hack to not do indexOf twice
    var len = b64.length
    placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

    // base64 is 4/3 + up to two characters of the original data
    arr = new Arr(b64.length * 3 / 4 - placeHolders)

    // if there are placeholders, only get up to the last complete 4 chars
    l = placeHolders > 0 ? b64.length - 4 : b64.length

    var L = 0

    function push (v) {
      arr[L++] = v
    }

    for (i = 0, j = 0; i < l; i += 4, j += 3) {
      tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
      push((tmp & 0xFF0000) >> 16)
      push((tmp & 0xFF00) >> 8)
      push(tmp & 0xFF)
    }

    if (placeHolders === 2) {
      tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
      push(tmp & 0xFF)
    } else if (placeHolders === 1) {
      tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
      push((tmp >> 8) & 0xFF)
      push(tmp & 0xFF)
    }

    return arr
  }

  function uint8ToBase64 (uint8) {
    var i,
      extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
      output = "",
      temp, length

    function encode (num) {
      return lookup.charAt(num)
    }

    function tripletToBase64 (num) {
      return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
    }

    // go through the array every three bytes, we'll deal with trailing stuff later
    for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
      temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
      output += tripletToBase64(temp)
    }

    // pad the end with zeros, but make sure to not forget the extra bytes
    switch (extraBytes) {
      case 1:
        temp = uint8[uint8.length - 1]
        output += encode(temp >> 2)
        output += encode((temp << 4) & 0x3F)
        output += '=='
        break
      case 2:
        temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
        output += encode(temp >> 10)
        output += encode((temp >> 4) & 0x3F)
        output += encode((temp << 2) & 0x3F)
        output += '='
        break
    }

    return output
  }

  exports.toByteArray = b64ToByteArray
  exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/node_modules/base64-js/lib/b64.js","/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/node_modules/base64-js/lib")
},{"buffer":52,"oMfpAn":55}],54:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/node_modules/ieee754/index.js","/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/node_modules/ieee754")
},{"buffer":52,"oMfpAn":55}],55:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/process/browser.js","/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/process")
},{"buffer":52,"oMfpAn":55}],56:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// From https://gist.github.com/epeli/11209665

var Promise = require("bluebird");

// So you can `var request = require("superagent-bluebird-promise")`
var superagent = module.exports = require("superagent");
var Request = superagent.Request;

// Create custom error type.
// Create a new object, that prototypally inherits from the Error constructor.
var SuperagentPromiseError = function(message, originalError) {
  var stack;
  this.message = message;
  this.name = 'SuperagentPromiseError';
  this.originalError = originalError;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, this.constructor);
    stack = this.stack;
  }
  else {
    stack = (new Error(message)).stack;
  }

  if (Object.defineProperty) {
    Object.defineProperty(this, 'stack', {
      get: function() {
        if (this.originalError) {
          return stack + '\nCaused by:  ' + this.originalError.stack;
        }

        return stack;
      }
    });
  }
};

SuperagentPromiseError.prototype = new Error();
SuperagentPromiseError.prototype.constructor = SuperagentPromiseError;
superagent.SuperagentPromiseError = SuperagentPromiseError;

/**
 * @namespace utils
 * @class Superagent
 */

/**
 *
 * Add promise support for superagent/supertest
 *
 * Call .promise() to return promise for the request
 *
 * @method then
 * @return {Bluebird.Promise}
 */
Request.prototype.promise = function() {
  var req = this;
  var error;

  return new Promise(function(resolve, reject) {
      req.end(function(err, res) {
        if (typeof res !== "undefined" && res.status >= 400) {
          var msg = 'cannot ' + req.method + ' ' + req.url + ' (' + res.status + ')';
          error = new SuperagentPromiseError(msg);
          error.status = res.status;
          error.body = res.body;
          error.res = res;
          reject(error);
        } else if (err) {
          reject(new SuperagentPromiseError('Bad request', err));
        } else {
          resolve(res);
        }
      });
    })
    .cancellable()
    .caught(Promise.CancellationError, function(err) {
      req.abort();
      throw err;
    });
};

/**
 *
 * Make superagent requests Promises/A+ conformant
 *
 * Call .then([onFulfilled], [onRejected]) to register callbacks
 *
 * @method then
 * @param {function} [onFulfilled]
 * @param {function} [onRejected]
 * @return {Bluebird.Promise}
 */
Request.prototype.then = function() {
  var promise = this.promise();
  return promise.then.apply(promise, arguments);
};

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/superagent-bluebird-promise/index.js","/../../node_modules/superagent-bluebird-promise")
},{"bluebird":1,"buffer":52,"oMfpAn":55,"superagent":57}],57:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * Module dependencies.
 */

var Emitter = require('emitter');
var reduce = require('reduce');

/**
 * Root reference for iframes.
 */

var root;
if (typeof window !== 'undefined') { // Browser window
  root = window;
} else if (typeof self !== 'undefined') { // Web Worker
  root = self;
} else { // Other environments
  root = this;
}

/**
 * Noop.
 */

function noop(){};

/**
 * Check if `obj` is a host object,
 * we don't want to serialize these :)
 *
 * TODO: future proof, move to compoent land
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isHost(obj) {
  var str = {}.toString.call(obj);

  switch (str) {
    case '[object File]':
    case '[object Blob]':
    case '[object FormData]':
      return true;
    default:
      return false;
  }
}

/**
 * Determine XHR.
 */

request.getXHR = function () {
  if (root.XMLHttpRequest
      && (!root.location || 'file:' != root.location.protocol
          || !root.ActiveXObject)) {
    return new XMLHttpRequest;
  } else {
    try { return new ActiveXObject('Microsoft.XMLHTTP'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP.6.0'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP.3.0'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP'); } catch(e) {}
  }
  return false;
};

/**
 * Removes leading and trailing whitespace, added to support IE.
 *
 * @param {String} s
 * @return {String}
 * @api private
 */

var trim = ''.trim
  ? function(s) { return s.trim(); }
  : function(s) { return s.replace(/(^\s*|\s*$)/g, ''); };

/**
 * Check if `obj` is an object.
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isObject(obj) {
  return obj === Object(obj);
}

/**
 * Serialize the given `obj`.
 *
 * @param {Object} obj
 * @return {String}
 * @api private
 */

function serialize(obj) {
  if (!isObject(obj)) return obj;
  var pairs = [];
  for (var key in obj) {
    if (null != obj[key]) {
      pairs.push(encodeURIComponent(key)
        + '=' + encodeURIComponent(obj[key]));
    }
  }
  return pairs.join('&');
}

/**
 * Expose serialization method.
 */

 request.serializeObject = serialize;

 /**
  * Parse the given x-www-form-urlencoded `str`.
  *
  * @param {String} str
  * @return {Object}
  * @api private
  */

function parseString(str) {
  var obj = {};
  var pairs = str.split('&');
  var parts;
  var pair;

  for (var i = 0, len = pairs.length; i < len; ++i) {
    pair = pairs[i];
    parts = pair.split('=');
    obj[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
  }

  return obj;
}

/**
 * Expose parser.
 */

request.parseString = parseString;

/**
 * Default MIME type map.
 *
 *     superagent.types.xml = 'application/xml';
 *
 */

request.types = {
  html: 'text/html',
  json: 'application/json',
  xml: 'application/xml',
  urlencoded: 'application/x-www-form-urlencoded',
  'form': 'application/x-www-form-urlencoded',
  'form-data': 'application/x-www-form-urlencoded'
};

/**
 * Default serialization map.
 *
 *     superagent.serialize['application/xml'] = function(obj){
 *       return 'generated xml here';
 *     };
 *
 */

 request.serialize = {
   'application/x-www-form-urlencoded': serialize,
   'application/json': JSON.stringify
 };

 /**
  * Default parsers.
  *
  *     superagent.parse['application/xml'] = function(str){
  *       return { object parsed from str };
  *     };
  *
  */

request.parse = {
  'application/x-www-form-urlencoded': parseString,
  'application/json': JSON.parse
};

/**
 * Parse the given header `str` into
 * an object containing the mapped fields.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function parseHeader(str) {
  var lines = str.split(/\r?\n/);
  var fields = {};
  var index;
  var line;
  var field;
  var val;

  lines.pop(); // trailing CRLF

  for (var i = 0, len = lines.length; i < len; ++i) {
    line = lines[i];
    index = line.indexOf(':');
    field = line.slice(0, index).toLowerCase();
    val = trim(line.slice(index + 1));
    fields[field] = val;
  }

  return fields;
}

/**
 * Return the mime type for the given `str`.
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

function type(str){
  return str.split(/ *; */).shift();
};

/**
 * Return header field parameters.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function params(str){
  return reduce(str.split(/ *; */), function(obj, str){
    var parts = str.split(/ *= */)
      , key = parts.shift()
      , val = parts.shift();

    if (key && val) obj[key] = val;
    return obj;
  }, {});
};

/**
 * Initialize a new `Response` with the given `xhr`.
 *
 *  - set flags (.ok, .error, etc)
 *  - parse header
 *
 * Examples:
 *
 *  Aliasing `superagent` as `request` is nice:
 *
 *      request = superagent;
 *
 *  We can use the promise-like API, or pass callbacks:
 *
 *      request.get('/').end(function(res){});
 *      request.get('/', function(res){});
 *
 *  Sending data can be chained:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' })
 *        .end(function(res){});
 *
 *  Or passed to `.send()`:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' }, function(res){});
 *
 *  Or passed to `.post()`:
 *
 *      request
 *        .post('/user', { name: 'tj' })
 *        .end(function(res){});
 *
 * Or further reduced to a single call for simple cases:
 *
 *      request
 *        .post('/user', { name: 'tj' }, function(res){});
 *
 * @param {XMLHTTPRequest} xhr
 * @param {Object} options
 * @api private
 */

function Response(req, options) {
  options = options || {};
  this.req = req;
  this.xhr = this.req.xhr;
  // responseText is accessible only if responseType is '' or 'text' and on older browsers
  this.text = ((this.req.method !='HEAD' && (this.xhr.responseType === '' || this.xhr.responseType === 'text')) || typeof this.xhr.responseType === 'undefined')
     ? this.xhr.responseText
     : null;
  this.statusText = this.req.xhr.statusText;
  this.setStatusProperties(this.xhr.status);
  this.header = this.headers = parseHeader(this.xhr.getAllResponseHeaders());
  // getAllResponseHeaders sometimes falsely returns "" for CORS requests, but
  // getResponseHeader still works. so we get content-type even if getting
  // other headers fails.
  this.header['content-type'] = this.xhr.getResponseHeader('content-type');
  this.setHeaderProperties(this.header);
  this.body = this.req.method != 'HEAD'
    ? this.parseBody(this.text ? this.text : this.xhr.response)
    : null;
}

/**
 * Get case-insensitive `field` value.
 *
 * @param {String} field
 * @return {String}
 * @api public
 */

Response.prototype.get = function(field){
  return this.header[field.toLowerCase()];
};

/**
 * Set header related properties:
 *
 *   - `.type` the content type without params
 *
 * A response of "Content-Type: text/plain; charset=utf-8"
 * will provide you with a `.type` of "text/plain".
 *
 * @param {Object} header
 * @api private
 */

Response.prototype.setHeaderProperties = function(header){
  // content-type
  var ct = this.header['content-type'] || '';
  this.type = type(ct);

  // params
  var obj = params(ct);
  for (var key in obj) this[key] = obj[key];
};

/**
 * Force given parser
 * 
 * Sets the body parser no matter type.
 * 
 * @param {Function}
 * @api public
 */

Response.prototype.parse = function(fn){
  this.parser = fn;
  return this;
};

/**
 * Parse the given body `str`.
 *
 * Used for auto-parsing of bodies. Parsers
 * are defined on the `superagent.parse` object.
 *
 * @param {String} str
 * @return {Mixed}
 * @api private
 */

Response.prototype.parseBody = function(str){
  var parse = this.parser || request.parse[this.type];
  return parse && str && (str.length || str instanceof Object)
    ? parse(str)
    : null;
};

/**
 * Set flags such as `.ok` based on `status`.
 *
 * For example a 2xx response will give you a `.ok` of __true__
 * whereas 5xx will be __false__ and `.error` will be __true__. The
 * `.clientError` and `.serverError` are also available to be more
 * specific, and `.statusType` is the class of error ranging from 1..5
 * sometimes useful for mapping respond colors etc.
 *
 * "sugar" properties are also defined for common cases. Currently providing:
 *
 *   - .noContent
 *   - .badRequest
 *   - .unauthorized
 *   - .notAcceptable
 *   - .notFound
 *
 * @param {Number} status
 * @api private
 */

Response.prototype.setStatusProperties = function(status){
  // handle IE9 bug: http://stackoverflow.com/questions/10046972/msie-returns-status-code-of-1223-for-ajax-request
  if (status === 1223) {
    status = 204;
  }

  var type = status / 100 | 0;

  // status / class
  this.status = this.statusCode = status;
  this.statusType = type;

  // basics
  this.info = 1 == type;
  this.ok = 2 == type;
  this.clientError = 4 == type;
  this.serverError = 5 == type;
  this.error = (4 == type || 5 == type)
    ? this.toError()
    : false;

  // sugar
  this.accepted = 202 == status;
  this.noContent = 204 == status;
  this.badRequest = 400 == status;
  this.unauthorized = 401 == status;
  this.notAcceptable = 406 == status;
  this.notFound = 404 == status;
  this.forbidden = 403 == status;
};

/**
 * Return an `Error` representative of this response.
 *
 * @return {Error}
 * @api public
 */

Response.prototype.toError = function(){
  var req = this.req;
  var method = req.method;
  var url = req.url;

  var msg = 'cannot ' + method + ' ' + url + ' (' + this.status + ')';
  var err = new Error(msg);
  err.status = this.status;
  err.method = method;
  err.url = url;

  return err;
};

/**
 * Expose `Response`.
 */

request.Response = Response;

/**
 * Initialize a new `Request` with the given `method` and `url`.
 *
 * @param {String} method
 * @param {String} url
 * @api public
 */

function Request(method, url) {
  var self = this;
  Emitter.call(this);
  this._query = this._query || [];
  this.method = method;
  this.url = url;
  this.header = {};
  this._header = {};
  this.on('end', function(){
    var err = null;
    var res = null;

    try {
      res = new Response(self);
    } catch(e) {
      err = new Error('Parser is unable to parse the response');
      err.parse = true;
      err.original = e;
      return self.callback(err);
    }

    self.emit('response', res);

    if (err) {
      return self.callback(err, res);
    }

    if (res.status >= 200 && res.status < 300) {
      return self.callback(err, res);
    }

    var new_err = new Error(res.statusText || 'Unsuccessful HTTP response');
    new_err.original = err;
    new_err.response = res;
    new_err.status = res.status;

    self.callback(new_err, res);
  });
}

/**
 * Mixin `Emitter`.
 */

Emitter(Request.prototype);

/**
 * Allow for extension
 */

Request.prototype.use = function(fn) {
  fn(this);
  return this;
}

/**
 * Set timeout to `ms`.
 *
 * @param {Number} ms
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.timeout = function(ms){
  this._timeout = ms;
  return this;
};

/**
 * Clear previous timeout.
 *
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.clearTimeout = function(){
  this._timeout = 0;
  clearTimeout(this._timer);
  return this;
};

/**
 * Abort the request, and clear potential timeout.
 *
 * @return {Request}
 * @api public
 */

Request.prototype.abort = function(){
  if (this.aborted) return;
  this.aborted = true;
  this.xhr.abort();
  this.clearTimeout();
  this.emit('abort');
  return this;
};

/**
 * Set header `field` to `val`, or multiple fields with one object.
 *
 * Examples:
 *
 *      req.get('/')
 *        .set('Accept', 'application/json')
 *        .set('X-API-Key', 'foobar')
 *        .end(callback);
 *
 *      req.get('/')
 *        .set({ Accept: 'application/json', 'X-API-Key': 'foobar' })
 *        .end(callback);
 *
 * @param {String|Object} field
 * @param {String} val
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.set = function(field, val){
  if (isObject(field)) {
    for (var key in field) {
      this.set(key, field[key]);
    }
    return this;
  }
  this._header[field.toLowerCase()] = val;
  this.header[field] = val;
  return this;
};

/**
 * Remove header `field`.
 *
 * Example:
 *
 *      req.get('/')
 *        .unset('User-Agent')
 *        .end(callback);
 *
 * @param {String} field
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.unset = function(field){
  delete this._header[field.toLowerCase()];
  delete this.header[field];
  return this;
};

/**
 * Get case-insensitive header `field` value.
 *
 * @param {String} field
 * @return {String}
 * @api private
 */

Request.prototype.getHeader = function(field){
  return this._header[field.toLowerCase()];
};

/**
 * Set Content-Type to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.xml = 'application/xml';
 *
 *      request.post('/')
 *        .type('xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 *      request.post('/')
 *        .type('application/xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 * @param {String} type
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.type = function(type){
  this.set('Content-Type', request.types[type] || type);
  return this;
};

/**
 * Set Accept to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.json = 'application/json';
 *
 *      request.get('/agent')
 *        .accept('json')
 *        .end(callback);
 *
 *      request.get('/agent')
 *        .accept('application/json')
 *        .end(callback);
 *
 * @param {String} accept
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.accept = function(type){
  this.set('Accept', request.types[type] || type);
  return this;
};

/**
 * Set Authorization field value with `user` and `pass`.
 *
 * @param {String} user
 * @param {String} pass
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.auth = function(user, pass){
  var str = btoa(user + ':' + pass);
  this.set('Authorization', 'Basic ' + str);
  return this;
};

/**
* Add query-string `val`.
*
* Examples:
*
*   request.get('/shoes')
*     .query('size=10')
*     .query({ color: 'blue' })
*
* @param {Object|String} val
* @return {Request} for chaining
* @api public
*/

Request.prototype.query = function(val){
  if ('string' != typeof val) val = serialize(val);
  if (val) this._query.push(val);
  return this;
};

/**
 * Write the field `name` and `val` for "multipart/form-data"
 * request bodies.
 *
 * ``` js
 * request.post('/upload')
 *   .field('foo', 'bar')
 *   .end(callback);
 * ```
 *
 * @param {String} name
 * @param {String|Blob|File} val
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.field = function(name, val){
  if (!this._formData) this._formData = new root.FormData();
  this._formData.append(name, val);
  return this;
};

/**
 * Queue the given `file` as an attachment to the specified `field`,
 * with optional `filename`.
 *
 * ``` js
 * request.post('/upload')
 *   .attach(new Blob(['<a id="a"><b id="b">hey!</b></a>'], { type: "text/html"}))
 *   .end(callback);
 * ```
 *
 * @param {String} field
 * @param {Blob|File} file
 * @param {String} filename
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.attach = function(field, file, filename){
  if (!this._formData) this._formData = new root.FormData();
  this._formData.append(field, file, filename);
  return this;
};

/**
 * Send `data`, defaulting the `.type()` to "json" when
 * an object is given.
 *
 * Examples:
 *
 *       // querystring
 *       request.get('/search')
 *         .end(callback)
 *
 *       // multiple data "writes"
 *       request.get('/search')
 *         .send({ search: 'query' })
 *         .send({ range: '1..5' })
 *         .send({ order: 'desc' })
 *         .end(callback)
 *
 *       // manual json
 *       request.post('/user')
 *         .type('json')
 *         .send('{"name":"tj"})
 *         .end(callback)
 *
 *       // auto json
 *       request.post('/user')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // manual x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send('name=tj')
 *         .end(callback)
 *
 *       // auto x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // defaults to x-www-form-urlencoded
  *      request.post('/user')
  *        .send('name=tobi')
  *        .send('species=ferret')
  *        .end(callback)
 *
 * @param {String|Object} data
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.send = function(data){
  var obj = isObject(data);
  var type = this.getHeader('Content-Type');

  // merge
  if (obj && isObject(this._data)) {
    for (var key in data) {
      this._data[key] = data[key];
    }
  } else if ('string' == typeof data) {
    if (!type) this.type('form');
    type = this.getHeader('Content-Type');
    if ('application/x-www-form-urlencoded' == type) {
      this._data = this._data
        ? this._data + '&' + data
        : data;
    } else {
      this._data = (this._data || '') + data;
    }
  } else {
    this._data = data;
  }

  if (!obj || isHost(data)) return this;
  if (!type) this.type('json');
  return this;
};

/**
 * Invoke the callback with `err` and `res`
 * and handle arity check.
 *
 * @param {Error} err
 * @param {Response} res
 * @api private
 */

Request.prototype.callback = function(err, res){
  var fn = this._callback;
  this.clearTimeout();
  fn(err, res);
};

/**
 * Invoke callback with x-domain error.
 *
 * @api private
 */

Request.prototype.crossDomainError = function(){
  var err = new Error('Origin is not allowed by Access-Control-Allow-Origin');
  err.crossDomain = true;
  this.callback(err);
};

/**
 * Invoke callback with timeout error.
 *
 * @api private
 */

Request.prototype.timeoutError = function(){
  var timeout = this._timeout;
  var err = new Error('timeout of ' + timeout + 'ms exceeded');
  err.timeout = timeout;
  this.callback(err);
};

/**
 * Enable transmission of cookies with x-domain requests.
 *
 * Note that for this to work the origin must not be
 * using "Access-Control-Allow-Origin" with a wildcard,
 * and also must set "Access-Control-Allow-Credentials"
 * to "true".
 *
 * @api public
 */

Request.prototype.withCredentials = function(){
  this._withCredentials = true;
  return this;
};

/**
 * Initiate request, invoking callback `fn(res)`
 * with an instanceof `Response`.
 *
 * @param {Function} fn
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.end = function(fn){
  var self = this;
  var xhr = this.xhr = request.getXHR();
  var query = this._query.join('&');
  var timeout = this._timeout;
  var data = this._formData || this._data;

  // store callback
  this._callback = fn || noop;

  // state change
  xhr.onreadystatechange = function(){
    if (4 != xhr.readyState) return;

    // In IE9, reads to any property (e.g. status) off of an aborted XHR will
    // result in the error "Could not complete the operation due to error c00c023f"
    var status;
    try { status = xhr.status } catch(e) { status = 0; }

    if (0 == status) {
      if (self.timedout) return self.timeoutError();
      if (self.aborted) return;
      return self.crossDomainError();
    }
    self.emit('end');
  };

  // progress
  var handleProgress = function(e){
    if (e.total > 0) {
      e.percent = e.loaded / e.total * 100;
    }
    self.emit('progress', e);
  };
  if (this.hasListeners('progress')) {
    xhr.onprogress = handleProgress;
  }
  try {
    if (xhr.upload && this.hasListeners('progress')) {
      xhr.upload.onprogress = handleProgress;
    }
  } catch(e) {
    // Accessing xhr.upload fails in IE from a web worker, so just pretend it doesn't exist.
    // Reported here:
    // https://connect.microsoft.com/IE/feedback/details/837245/xmlhttprequest-upload-throws-invalid-argument-when-used-from-web-worker-context
  }

  // timeout
  if (timeout && !this._timer) {
    this._timer = setTimeout(function(){
      self.timedout = true;
      self.abort();
    }, timeout);
  }

  // querystring
  if (query) {
    query = request.serializeObject(query);
    this.url += ~this.url.indexOf('?')
      ? '&' + query
      : '?' + query;
  }

  // initiate request
  xhr.open(this.method, this.url, true);

  // CORS
  if (this._withCredentials) xhr.withCredentials = true;

  // body
  if ('GET' != this.method && 'HEAD' != this.method && 'string' != typeof data && !isHost(data)) {
    // serialize stuff
    var contentType = this.getHeader('Content-Type');
    var serialize = request.serialize[contentType ? contentType.split(';')[0] : ''];
    if (serialize) data = serialize(data);
  }

  // set header fields
  for (var field in this.header) {
    if (null == this.header[field]) continue;
    xhr.setRequestHeader(field, this.header[field]);
  }

  // send stuff
  this.emit('request', this);
  xhr.send(data);
  return this;
};

/**
 * Faux promise support
 *
 * @param {Function} fulfill
 * @param {Function} reject
 * @return {Request}
 */

Request.prototype.then = function (fulfill, reject) {
  return this.end(function(err, res) {
    err ? reject(err) : fulfill(res);
  });
}

/**
 * Expose `Request`.
 */

request.Request = Request;

/**
 * Issue a request:
 *
 * Examples:
 *
 *    request('GET', '/users').end(callback)
 *    request('/users').end(callback)
 *    request('/users', callback)
 *
 * @param {String} method
 * @param {String|Function} url or callback
 * @return {Request}
 * @api public
 */

function request(method, url) {
  // callback
  if ('function' == typeof url) {
    return new Request('GET', method).end(url);
  }

  // url first
  if (1 == arguments.length) {
    return new Request('GET', method);
  }

  return new Request(method, url);
}

/**
 * GET `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.get = function(url, data, fn){
  var req = request('GET', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.query(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * HEAD `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.head = function(url, data, fn){
  var req = request('HEAD', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * DELETE `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.del = function(url, fn){
  var req = request('DELETE', url);
  if (fn) req.end(fn);
  return req;
};

/**
 * PATCH `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} data
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.patch = function(url, data, fn){
  var req = request('PATCH', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * POST `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} data
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.post = function(url, data, fn){
  var req = request('POST', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * PUT `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.put = function(url, data, fn){
  var req = request('PUT', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * Expose `request`.
 */

module.exports = request;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/superagent/lib/client.js","/../../node_modules/superagent/lib")
},{"buffer":52,"emitter":58,"oMfpAn":55,"reduce":59}],58:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){

/**
 * Expose `Emitter`.
 */

module.exports = Emitter;

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks[event] = this._callbacks[event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  var self = this;
  this._callbacks = this._callbacks || {};

  function on() {
    self.off(event, on);
    fn.apply(this, arguments);
  }

  on.fn = fn;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks[event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks[event];
    return this;
  }

  // remove specific handler
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks[event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks[event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/superagent/node_modules/component-emitter/index.js","/../../node_modules/superagent/node_modules/component-emitter")
},{"buffer":52,"oMfpAn":55}],59:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){

/**
 * Reduce `arr` with `fn`.
 *
 * @param {Array} arr
 * @param {Function} fn
 * @param {Mixed} initial
 *
 * TODO: combatible error handling?
 */

module.exports = function(arr, fn, initial){  
  var idx = 0;
  var len = arr.length;
  var curr = arguments.length == 3
    ? initial
    : arr[idx++];

  while (idx < len) {
    curr = fn.call(null, curr, arr[idx], ++idx, arr);
  }
  
  return curr;
};
}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/superagent/node_modules/reduce-component/index.js","/../../node_modules/superagent/node_modules/reduce-component")
},{"buffer":52,"oMfpAn":55}],60:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var airmap = window.Airmap || {};
airmap.Verification = require('./verification');
window.Airmap = airmap;
}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/fake_54bb527d.js","/")
},{"./verification":61,"buffer":52,"oMfpAn":55}],61:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var Promise = require('bluebird');
var request = require('superagent-bluebird-promise');
var extend = require('extend');

// braintree dependencies
var braintree = require('braintree-web');
var valid = require('card-validator');

var baseUrl = 'https://api.airmap.io/verify/v1/';
var timeout = 15 * 1000;    // 30 seconds

var Verification = function (key, version, mode, info, options, callback) {
    var apiKey = key, opts = options;
    var personalInfo = info;
    var phoneField, phoneTokenField, countryCodeField, phoneForm, phoneTokenForm, numValidationCallback;
    var phone;
    var self = this;

    if (!key)
        throw 'key required';

    if (!mode)
        throw 'mode required';

    if (!version)
        throw 'app version required';

    if (!info || !info.user_id)
        throw 'user_id required in personal info';

    if (mode == 'phone')
        setupPhoneVerification(opts);
    else if (mode == 'credit-card')
        setupCreditCardVerification(opts);
    else
        throw 'unsupported verification mode'

    function setupPhoneVerification(args) {
        if (!args.phoneForm || !args.phoneField || !args.tokenForm || !args.tokenField)
            throw 'phone form, phoneField, token form, and tokenField required for phone verification';
        else {
            phoneForm = document.getElementById(args.phoneForm.replace('#', ''));
            phoneTokenForm = document.getElementById(args.tokenForm.replace('#', ''));

            disableFormSubmit(phoneForm, getPhoneToken);
            disableFormSubmit(phoneTokenForm, verifyPhone);

            // update the form fields because the disable replaces the object reference
            phoneForm = document.getElementById(args.phoneForm.replace('#', ''));
            phoneTokenForm = document.getElementById(args.tokenForm.replace('#', ''));
            phoneField = document.getElementById(args.phoneField.replace('#', ''));
            phoneTokenField = document.getElementById(args.tokenField.replace('#', ''));
            countryCodeField = document.getElementById(args.countryCodeField.replace('#', ''));
        }

        if (args.numberValidationCompleted)
            numValidationCallback = args.numberValidationCompleted;
    }

    function setupCreditCardVerification(args) {
        request
            .get(baseUrl + 'credit-card/token')
            .set('X-API-Key', apiKey)
            .timeout(timeout)
            .promise()
            .then(function (res) {
                buildCreditCardUI(args, res.body.token);
            })
            .catch(function (error) {
                console.error('error building credit card verification form ui');
            });
    }

    function getPhoneToken(e) {
        if (e.preventDefault) e.preventDefault();

        request.get(baseUrl + 'phone/format')
            .query({ phone: phoneField.value, country: countryCodeField.value, appVersion: version })
            .set('X-API-Key', apiKey)
            .timeout(timeout)
            .promise()
            .then(function (res) {
                if (res.body.status == 'failed')
                    throw 'phone formatting failed';

                phone = res.body.formatted;
                var body = extend({ phone: phone, appVersion: version, user_id: personalInfo.user_id }, personalInfo);
                return request
                    .post(baseUrl + 'phone/token')
                    .send(body)
                    .set('X-API-Key', apiKey)
                    .timeout(timeout)
                    .promise();
            })
            .then(function (res) {
                if (numValidationCallback)
                    numValidationCallback(true);
            })
            .catch(function (error) {
                if (numValidationCallback)
                    numValidationCallback(false);
            });
    }

    function verifyPhone(e) {
        if (e.preventDefault) e.preventDefault();

        if (!personalInfo) {
            console.error('personal information not set');
            return;
        }

        request
            .post(baseUrl + 'phone/verify')
            .send({ phone: phone, phone_token: phoneTokenField.value, user_id: personalInfo.user_id, appVersion: version })
            .set('X-API-Key', apiKey)
            .timeout(timeout)
            .promise()
            .then(function (res) {
                if (callback)
                    callback(null, { verified: res.body.verified, token: res.body.token});
            })
            .catch(function (err) {
                if (callback)
                    callback('error verifying phone number', null);
            });
    }

    function buildCreditCardUI(args, token) {
        if (!args.form || !args.cardField || !args.expirationMonthField || !args.expirationYearField || !args.cvvField)
            throw 'form, cardField, expirationMonthField, expirationYearField, and cvvField DOM ids required for credit card verfication';
        var braintreeOptions = {
            onReady: function (integration) {
                self.checkout = integration;
            },
            onPaymentMethodReceived: function (payload) {
                request
                    .post(baseUrl + 'credit-card/verify')
                    .send(extend({ nonce: payload.nonce, appVersion: version, user_id: personalInfo.user_id }, personalInfo))
                    .set('X-API-Key', apiKey)
                    .timeout(timeout)
                    .promise()
                    .then(function (res) {
                        if (callback)
                            callback(null, { verified: res.body.verified, token: res.body.token });
                    })
                    .catch(function (err) {
                        if (callback)
                            callback('error verifying credit card', null);
                    });
            },
            onError: function (error) {
                if (callback)
                    callback('error verifying credit card', null);
            },
            id: options.form,
            hostedFields: {
                number: {
                    selector: options.cardField,
                    placeholder: options.cardFieldPlaceholder || 'Credit Card Number',
                },
                expirationMonth: {
                    selector: options.expirationMonthField,
                    placeholder: options.expirationMonthFieldPlaceholder || 'Month',
                },
                expirationYear: {
                    selector: options.expirationYearField,
                    placeholder: options.expirationYearFieldPlaceholder || 'Year',
                },
                cvv: {
                    selector: options.cvvField,
                    placeholder: options.cvvFieldPlaceholder || "CVV",
                },
                onFieldEvent: options.fieldEvent,
                styles: options.styles
            }
        };

        // setup braintree w/ hosted fields
        braintree.setup(token, 'custom', braintreeOptions);
    }

    function disableFormSubmit(form, event) {
        // hack to remove all event listeners by cloning node
        var cloned = form.cloneNode(true);
        form.parentNode.replaceChild(cloned, form);
        form = cloned;

        if (form.attachEvent)
            form.attachEvent('submit', event);
        else
            form.addEventListener('submit', event);
    }
}

Verification.prototype.cleanup = function () {
    this.checkout.teardown(function () {
        this.checkout = null;
    });
}

module.exports = exports = Verification;
}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/verification.js","/")
},{"bluebird":1,"braintree-web":2,"buffer":52,"card-validator":3,"extend":51,"oMfpAn":55,"superagent-bluebird-promise":56}]},{},[60])
