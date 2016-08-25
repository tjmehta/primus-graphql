var bindAll = require('101/bind-all')
var debug = require('debug')('primus-graphql:subscribe-callbacks')

// var activeSubscriptions = require('./active-subscriptions.js')

module.exports = SubscribeCallbacks

function SubscribeCallbacks (payload, queryExecutor, responder) {
  debug('SubscribeCallbacks:', payload.id)
  this._payload = payload
  this._queryExecutor = queryExecutor
  this._responder = responder
  // bind handlers
  bindAll(this, [
    'onCompleted',
    'onError',
    'onNext'
  ])
}

SubscribeCallbacks.prototype.onCompleted = function () {
  var id = this._payload.id
  debug('onCompleted:', id)
  this._responder.sendEvent(id, 'completed')
}

SubscribeCallbacks.prototype.onError = function (err) {
  var id = this._payload.id
  debug('onError:', id, err)
  this._responder.sendEvent(id, 'error', err)
}

SubscribeCallbacks.prototype.onNext = function (next) {
  var id = this._payload.id
  debug('onNext:', id, next)
  this._responder.sendEvent(id, 'next', next)
}
