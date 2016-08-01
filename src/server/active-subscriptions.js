var assert = require('assert')

var castArr = require('cast-array')
var debug = require('debug')('primus-graphql:active-subscriptions')
var forEach = require('object-loops/for-each')
var isEmpty = require('101/is-empty')

var isRxSubscription = require('./is-rx-subscription.js')

function ActiveSubscriptions () {
  this._subscriptionsByConn = {}
}

/**
 * add subscription to active-subscriptions
 * @param {String} connId  connection id
 * @param {String} payloadId  payload id of subscription (subscription id)
 * @param {RxSubscription} subscription  rx subscription for payload (disposable)
 */
ActiveSubscriptions.prototype.add = function (connId, payloadId, subscription) {
  debug('add subscription:', connId, payloadId)
  assert(isRxSubscription(subscription), '"subscription" must be a subscription')
  this._set([connId, payloadId], subscription)
  /* istanbul ignore next */
  debug('subscriptions', debug.enabled && Object.keys(this._subscriptionsByConn))
}

/**
 * add subscription to active-subscriptions
 * @param {String} connId  connection id
 * @param {String} payloadId  payload id of subscription (subscription id)
 */
ActiveSubscriptions.prototype.remove = function (connId, payloadId) {
  debug('remove subscription:', connId, payloadId)
  var subscription = this._get([connId, payloadId])
  debug('unsubscribe subscription, found?', connId, payloadId, !!subscription)
  if (subscription) {
    debug('unsubscribe subscription', connId, payloadId)
    subscription.unsubscribe()
  }
  this._del(connId)
  /* istanbul ignore next */
  debug('subscriptions')
}

/**
 * remove all subscriptions for connId
 * @param {String} connId  connection id
 */
ActiveSubscriptions.prototype.removeAll = function (connId) {
  debug('remove all subscriptions:', connId)
  var subscriptions = this._get(connId)
  forEach(subscriptions, function (subscription) {
    subscription.unsubscribe()
  })
  this._del(connId)
}

// subscription-store private methods
ActiveSubscriptions.prototype._del = function (rootKey) {
  debug('_del:', rootKey)
  delete this._subscriptionsByConn[rootKey]
}
ActiveSubscriptions.prototype._get = function (keys) {
  debug('_get:', keys)
  keys = castArr(keys)
  return keys.reduce(function (val, key) {
    return val && val[key]
  }, this._subscriptionsByConn)
}
ActiveSubscriptions.prototype._set = function (keys, val) {
  debug('_set:', keys)
  keys = castArr(keys)
  return keys.reduce(function (obj, key, i, keys) {
    if (i < keys.length - 1) {
      debug('_set each:', key, keys, i, {})
      obj[key] = obj[key] || {}
    } else {
      debug('_set each:', key, keys, i, 'subscription')
      obj[key] = val
    }
    return obj[key]
  }, this._subscriptionsByConn)
}

// return singleton
module.exports = new ActiveSubscriptions()
