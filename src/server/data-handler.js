var bindAll = require('101/bind-all')
var debug = require('debug')('primus-graphql:data-handler')

var activeSubscriptions = require('./active-subscriptions.js')
var QueryExecutor = require('./query-executor.js')
var SubscribeCallbacks = require('./subscribe-callbacks.js')
var Responder = require('./responder.js')

module.exports = DataHandler

function DataHandler (spark, opts, primusOpts) {
  debug('DataHandler:', 'spark', opts, primusOpts)
  this._spark = spark
  this._key = primusOpts.key
  // models
  this._queryExecutor = new QueryExecutor(spark, opts, primusOpts)
  this._responder = new Responder(spark, opts, primusOpts)
  // bind data handler
  bindAll(this, [
    'handleData',
    'handleClose'
  ])
}

/**
 * handle data connection close
 */
DataHandler.prototype.handleClose = function () {
  activeSubscriptions.unsubscribeAll(this._spark.id)
}

/**
 * handle incoming data from client
 * @param {Object} data
 */
DataHandler.prototype.handleData = function (data) {
  debug('handle:', data)
  var payload = data[this._key]
  if (!payload) { return }
  if (!payload.id) {
    debug('invalid payload (missing id)', payload)
    return
  }
  // handle graphql payload
  if (payload.event) {
    this._handleEvent(payload)
    return
  } else if (payload.query) {
    var operation = this._parseQueryOperation(payload)
    if (operation === 'subscription') {
      this._handleSubscription(payload)
    } else { // handle all others
      this._handleQueryOrMutation(payload)
    }
  } else {
    debug('invalid payload (missing query or event)', payload)
    var err = new Error('payload.query or payload.event is required')
    this._responder.sendErrs(payload.id, 400, [err])
  }
}

/**
 * handle incoming data from client
 * @param {Object} payload
 */
DataHandler.prototype._handleEvent = function (payload) {
  debug('_handleEvent:', payload)
  if (payload.event === 'unsubscribe') {
    debug('unsubscribe event', payload.id)
    activeSubscriptions.unsubscribe(this._spark.id, payload.id)
  } else {
    debug('invalid event payload', payload)
  }
}

/**
 * handle query or mutation payload
 * @param {Object} payload
 * @return {Promise}
 */
DataHandler.prototype._handleQueryOrMutation = function (payload) {
  debug('_handleQueryOrMutation:', payload)
  var self = this
  var id = payload.id
  return this._queryExecutor.execute(payload).then(function (resPayload) {
    self._responder.send(id, 200, resPayload)
  }).catch(function (err) {
    self._responder.sendErrs(id, err.statusCode, [err])
  })
}

/**
 * handle subscription payload
 * @param {Object} payload
 * @return {RxSubscription}
 */
DataHandler.prototype._handleSubscription = function (payload) {
  debug('_handleSubscription:', payload)
  var spark = this._spark
  var observable = this._queryExecutor.observe(payload)
  var callbacks = new SubscribeCallbacks(payload, this._queryExecutor, this._responder)
  var rxSubscription = observable.subscribe(
    callbacks.onNext,
    callbacks.onError,
    callbacks.onCompleted
  )
  rxSubscription.add(function () {
    // on unsubscribe
    activeSubscriptions.remove(spark.id, payload.id)
  })
  activeSubscriptions.add(spark.id, payload.id, rxSubscription)
  return rxSubscription
}

/**
 * parse operation type from a graphql query string
 * @param {String} payload
 * @return {String} operation
 */
var queryRE = /^([^ {]*)/
DataHandler.prototype._parseQueryOperation = function (payload) {
  var query = payload.query
  debug('_parseQueryOperation', query)
  if (typeof query !== 'string') {
    debug('query must be a string')
    var err = new Error('payload.query must be a string')
    this._responder.sendErrs(payload.id, 400, [err])
  }
  var match = queryRE.exec(query)
  // index 1 is group 1
  return match[1]
}
