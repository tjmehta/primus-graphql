var assert = require('assert')

var util = require('util')

var bindAll = require('101/bind-all')
var debug = require('debug')('primus-graphql:subscription-observable')
var Observable = require('rxjs/Observable').Observable
var parseErr = require('error-to-json').parse
var Subscription = require('rxjs/Subscription').Subscription
// add subscription.dispose operator
require('../shared/subscription-dispose.js')

module.exports = SubscriptionObservable

function SubscriptionObservable (primus, resEE, data, primusOpts) {
  debug('SubscriptionObservable', data)
  Observable.call(this, this.__subscribe.bind(this))
  this._primus = primus
  this._resEE = resEE
  this._data = data
  this._key = primusOpts.key
  this._id = data[this._key].id
  // bind handlers
  bindAll(this, [
    '_onData',
    '_onReconnected'
  ])
}

// inherit from observable
util.inherits(SubscriptionObservable, Observable)

/**
 * subscribe to this observable
 * @private
 * @param  {SubscriptionObserver} observer
 * @return {DisposableSubscription} supports, both, unsubscribe() and dispose()
 */
SubscriptionObservable.prototype.__subscribe = function (observer) {
  var self = this
  debug('subscribe')
  this._resEE.on(this._id, this._onData)
  this._primus.on('reconnected', this._onReconnected)
  this._observer = observer
  this._sendSubscription()
  return new Subscription(function () {
    // unsubscribe
    debug('unsubscribe')
    self._resEE.removeListener(self._id, self._onData)
    self._primus.removeListener('reconnected', self._onReconnected)
    self._sendUnsubscribe()
  })
}

/**
 * send subscription query to server
 * @private
 * @param  {Boolean} reconnect  if subscription is being sent for a reconnect
 */
SubscriptionObservable.prototype._sendSubscription = function (reconnect) {
  var data = this._data
  debug('write', data)
  var writeSuccess = this._primus.write(data)
  if (!writeSuccess) {
    // Request failed
    var err = new Error('primus-graphql: write failed')
    this._observer.error(err)
  }
}

/**
 * send unsubscribe (dispose) to server
 * @private
 */
SubscriptionObservable.prototype._sendUnsubscribe = function () {
  debug('_sendUnsubscribe')
  var data = {}
  data[this._key] = {
    id: this._id,
    event: 'unsubscribe'
  }
  this._primus.write(data)
}

/**
 * data handler, parse payload and apply to observer
 * @private
 * @param  {Object} payload  from server
 */
SubscriptionObservable.prototype._onData = function (payload) {
  debug('_onData', payload)
  if (payload.event === 'next') {
    // next
    this._observer.next({ data: payload.data })
  } else if (payload.event === 'error') {
    // error
    var errors = payload.errors.map(parseErr)
    var err = getErr(errors)
    this._observer.error(err)
  } else { // if (payload.event === 'completed') {
    assert(payload.event === 'completed', 'unknown event: ' + payload.event)
    // complete
    this._observer.complete()
  }
  function getErr (errors) {
    var err
    if (errors.length === 1) {
      err = errors[0]
      if (err.errors) {
        return getErr(err.errors.map(parseErr))
      }
    } else {
      err = new Error('multiple errors')
      err.errors = errors
    }
    return err
  }
}

/**
 * reconnect handler
 * @private
 */
SubscriptionObservable.prototype._onReconnected = function () {
  this._sendSubscription(true)
}
