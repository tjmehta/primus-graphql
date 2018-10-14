var assert = require('assert')

var castArr = require('cast-array')
var debug = require('debug')('primus-graphql:active-iterators')
var isIterable = require('iterall').isAsyncIterable

function ActiveIterators () {
  this._iteratorsByConn = {}
}

/**
 * add iterator to active-iterators
 * @param {String} connId  connection id
 * @param {String} payloadId  payload id of iterator (iterator id)
 * @param {RxSubscription} iterator  rx iterator for payload (disposable)
 */
ActiveIterators.prototype.add = function (connId, payloadId, iterator) {
  debug('add iterator:', connId, payloadId)
  assert(isIterable(iterator), '"iterator" must be an async iterable')
  this._set([connId, payloadId], iterator)
  /* istanbul ignore next */
  debug('iterators', debug.enabled && Object.keys(this._iteratorsByConn))
}

/**
 * unsubscribe iterator. this will trigger removal from active-iterators (data-handler.js: rxSubscription.add)
 * @param {String} connId  connection id
 * @param {String} payloadId  payload id of iterator (iterator id)
 */
ActiveIterators.prototype.remove = function (connId, payloadId) {
  debug('remove iterator:', connId, payloadId)
  var iterators = this._get(connId)
  delete iterators[payloadId]
  if (Object.keys(iterators).length === 0) {
    this._del(connId)
  }
  /* istanbul ignore next */
  debug('iterators', debug.enabled && Object.keys(this._iteratorsByConn))
}

/**
 * unsubscribe specific iterator
 * @param {String} connId  connection id
 */
ActiveIterators.prototype.unsubscribe = function (connId, payloadId) {
  debug('unsubscribe:', connId, payloadId)
  var iterator = this._get(connId)[payloadId]
  if (iterator) {
    iterator.return()
    this.remove(connId, payloadId)
  }
  /* istanbul ignore next */
  debug('iterators', debug.enabled && Object.keys(this._iteratorsByConn))
}

/**
 * unsubscribe all iterators for connId
 * @param {String} connId  connection id
 */
ActiveIterators.prototype.unsubscribeAll = function (connId) {
  debug('unsubscribe all:', connId)
  var self = this
  var iterators = this._get(connId)
  Object.keys(iterators).forEach(function (payloadId) {
    self.unsubscribe(connId, payloadId)
  })
  /* istanbul ignore next */
  debug('iterators', debug.enabled && Object.keys(this._iteratorsByConn))
}

// iterator-store private methods
ActiveIterators.prototype._del = function (rootKey) {
  debug('_del:', rootKey)
  delete this._iteratorsByConn[rootKey]
}
ActiveIterators.prototype._get = function (rootKey) {
  debug('_get:', rootKey)
  return this._iteratorsByConn[rootKey] || {}
}
ActiveIterators.prototype._set = function (keys, val) {
  debug('_set:', keys)
  keys = castArr(keys)
  return keys.reduce(function (obj, key, i, keys) {
    if (i < keys.length - 1) {
      debug('_set each:', key, keys, i, {})
      obj[key] = obj[key] || {}
    } else {
      debug('_set each:', key, keys, i, 'iterator')
      obj[key] = val
    }
    return obj[key]
  }, this._iteratorsByConn)
}

// return singleton
module.exports = new ActiveIterators()
