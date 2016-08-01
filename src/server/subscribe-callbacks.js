var bindAll = require('101/bind-all')
var debug = require('debug')('primus-graphql:subscribe-callbacks')

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
  var self = this
  var id = this._payload.id
  debug('onNext:', id, next)
  var rootValue = next
  return this._queryExecutor.execute(this._payload, rootValue).then(function (payload) {
    self._responder.sendEvent(id, 'next', payload.data)
  }).catch(this.onError)
}
