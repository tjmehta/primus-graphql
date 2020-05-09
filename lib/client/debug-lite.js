'use strict';
/**
 * Debug Lite v1.0.0
 * https://github.com/renzocastro/debug-lite
 */

var namespaces = {};
var storage = localstorage();

function localstorage() {
  try {
    return window.localStorage;
  } catch (e) {}
}

var colors = [];

for (var i = 0; i <= 355; i += 24) {
  colors.push("hsl(".concat(i % 355, ", 100%, 60%)"));
}

var selectColor = function selectColor(namespace) {
  var hash = 0,
      i;

  for (i in namespace) {
    hash = (hash << 5) - hash + namespace.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  return colors[Math.abs(hash) % colors.length];
};

var createDebug = function createDebug(namespace, color) {
  var debug = function debug() {
    debug.enabled = !!debug.enabled;
    debug.color = debug.color || color || selectColor(namespace);
    if (!createDebug.enabled(namespace)) return;
    var args = Array.prototype.slice.call(arguments, 0);
    args.unshift("%c".concat(namespace, " \xBB"), "color: ".concat(debug.color, ";"));
    console.log.apply(console, args);
  };

  namespaces[namespace] = debug;
  return debug;
};

var debugEnabledTimeout;
var debugEnabledKeepTime = 500;

createDebug.disable = function (namespace) {
  if (namespaces[namespace] === undefined) {
    throw new Error("\"".concat(namespace, "\" don't exist"));
  }

  namespaces[namespace].enabled = false;
};

createDebug.enable = function (namespace) {
  if (namespaces[namespace] === undefined) {
    throw new Error("\"".concat(namespace, "\" don't exist"));
  }

  namespaces[namespace].enabled = true;
};

createDebug.enabled = function (namespace) {
  if (namespaces[namespace] === undefined) {
    throw new Error("\"".concat(namespace, "\" don't exist"));
  }

  if (namespaces[namespace].enabled) {
    return true;
  }

  var sDebug = String(storage.DEBUG || storage.debug || '');
  var enabled = sDebug === '*';

  if (!enabled) {
    var ns = namespace.split(':');
    var sDebugList = sDebug.split(',');

    var _i,
        t = sDebugList.length;

    for (_i = 0; _i < t; ++_i) {
      if (sDebugList[_i] === namespace || sDebugList[_i].indexOf("".concat(ns[0], ":*")) === 0) {
        enabled = true; // perf: keep enabled state by ${debugEnabledKeepTime}

        clearTimeout(debugEnabledTimeout);
        createDebug.enable(namespace);
        debugEnabledTimeout = setTimeout(createDebug.disable, debugEnabledKeepTime, namespace);
        break;
      }
    }
  }

  return enabled;
};

module.exports = createDebug;
