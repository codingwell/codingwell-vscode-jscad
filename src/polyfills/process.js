//
// Fork of npm process/browser.js
// Swapped setTimeout for MessageChannel which reduces latency from setTimeout throttling
//

// shim for using process in browser
var process = (module.exports = {});

var channel = new MessageChannel();
const messages = {};
let nextHandle = 1;
channel.port1.onmessage = function (event) {
  var handle = event.data;
  const callback = messages[handle];
  delete messages[handle];
  callback();
};

/** @param {() => void} callback  */
function executeNext(callback) {
  let canceled = false;

  const handle = nextHandle++;
  messages[handle] = () => {
    if (!canceled) {
      callback();
    }
  };

  channel.port2.postMessage(handle);
  return () => {
    canceled = true;
  };
}

var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
  if (!draining || !currentQueue) {
    return;
  }
  draining = false;
  if (currentQueue.length) {
    queue = currentQueue.concat(queue);
  } else {
    queueIndex = -1;
  }
  if (queue.length) {
    drainQueue();
  }
}

function drainQueue() {
  if (draining) {
    return;
  }
  const cancelCleanup = executeNext(cleanUpNextTick);
  draining = true;

  var len = queue.length;
  while (len) {
    currentQueue = queue;
    queue = [];
    while (++queueIndex < len) {
      if (currentQueue) {
        currentQueue[queueIndex].run();
      }
    }
    queueIndex = -1;
    len = queue.length;
  }
  currentQueue = null;
  draining = false;
  cancelCleanup();
}

process.nextTick = function (fun) {
  var args = new Array(arguments.length - 1);
  if (arguments.length > 1) {
    for (var i = 1; i < arguments.length; i++) {
      args[i - 1] = arguments[i];
    }
  }
  queue.push(new Item(fun, args));
  if (queue.length === 1 && !draining) {
    executeNext(drainQueue);
  }
};

// v8 likes predictible objects
function Item(fun, array) {
  this.fun = fun;
  this.array = array;
}
Item.prototype.run = function () {
  this.fun.apply(null, this.array);
};
process.title = "browser";
process.browser = true;
process.env = {};
process.argv = [];
process.version = ""; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) {
  return [];
};

process.binding = function (name) {
  throw new Error("process.binding is not supported");
};

process.cwd = function () {
  return "/";
};
process.chdir = function (dir) {
  throw new Error("process.chdir is not supported");
};
process.umask = function () {
  return 0;
};
