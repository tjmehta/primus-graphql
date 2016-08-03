var bindAll = require('101/bind-all')
var debug = require('debug')('primus-graphql:subscribe-callbacks')

var QueryExecutor = require('./query-executor.js')

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
  var parsed = QueryExecutor.parseQuery(self._payload.query)
  var subscriptionFieldName = parsed.definitions[0].selectionSet.selections[0].name.value
  var rootValue = {}
  rootValue[subscriptionFieldName] = next
  debug('onNext rootValue:', id, rootValue)
  return this._queryExecutor.execute(this._payload, rootValue).then(function (result) {
    self._responder.sendEvent(id, 'next', result.data)
  }).catch(this.onError)
}
