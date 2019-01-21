var assert = require('assert')

var bindAll = require('101/bind-all')
var debug = require('debug')('primus-graphql:data-handler')
var forAwaitEach = require('iterall').forAwaitEach

var activeIterators = require('./active-iterators.js')
var QueryExecutor = require('./query-executor.js')
var SubscribeCallbacks = require('./subscribe-callbacks.js')
var Responder = require('./responder.js')

module.exports = DataHandler

function DataHandler (opts, primusOpts) {
  debug('DataHandler:', 'spark', opts, primusOpts)
  this._spark = null
  this._opts = opts
  this._primusOpts = primusOpts
  // models
  this._responder = null
  // bind data handler
  bindAll(this, [
    'handleData',
    'handleClose',
    '_handleSubscriptionIteratorCompleted',
    '_handleSubscriptionIteratorNext',
    '_handleSubscriptionError'
  ])
}

/**
 * listen to spark events
 */
DataHandler.prototype.listenToSpark = function (spark) {
  assert(!this._spark, 'already listening to spark: ' + spark.id)
  this._spark = spark
  // create helpers
  this._queryExecutor = new QueryExecutor(spark, this._opts, this._primusOpts)
  this._responder = new Responder(spark, this._opts, this._primusOpts)
  // listen to spark events
  spark.on('data', this.handleData)
  spark.on('close', this.handleClose)
}

DataHandler.prototype.stopListeningToSpark = function () {
  if (!this._spark) return
  this._spark.removeListener('data', this.handleData)
  this._spark.removeListener('close', this.handleClose)
  activeIterators.unsubscribeAll(this._spark.id)
  delete this._spark
}

/**
 * handle data connection close
 */
DataHandler.prototype.handleClose = function () {
  activeIterators.unsubscribeAll(this._spark.id)
}

/**
 * handle incoming data from client
 * @param {Object} data
 */
DataHandler.prototype.handleData = function (data) {
  debug('handle:', data)
  var payload = data[this._primusOpts.key]
  if (!payload) {
    debug('ignore payload', payload)
    return
  }
  if (!payload.id) {
    debug('invalid payload (missing id)', payload)
    return
  }
  // handle graphql payload
  if (payload.event) {
    this._handleEvent(payload)
  } else if (payload.query) {
    var operation = this._parseQueryOperation(payload)
    if (!operation) return
    if (operation === 'subscription') {
      return this._handleSubscription(payload)
    } else { // handle all others
      return this._handleQueryOrMutation(payload)
    }
  } else {
    debug('invalid payload (missing query and event)', payload)
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
    activeIterators.unsubscribe(this._spark.id, payload.id)
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
    // check if spark has disconnected
    if (!self._spark) return
    self._responder.send(id, 200, resPayload)
  }).catch(function (err) {
    // check if spark has disconnected
    // this line is covered... not sure what is going on
    /* istanbul ignore next */
    if (!self._spark) return
    self._responder.sendErrs(id, err.status, [err])
  })
}

/**
 * handle subscription payload
 * @param {Object} payload
 * @return {RxSubscription}
 */
DataHandler.prototype._handleSubscription = function (payload) {
  debug('_handleSubscription:', payload)
  var self = this
  var callbacks = new SubscribeCallbacks(payload, this._queryExecutor, this._responder)
  return this._queryExecutor.subscribe(payload).then(function (iterator) {
    // check if spark has disconnected
    if (!self._spark) {
      iterator.return()
      return
    }
    // add to active iterators and await results
    activeIterators.add(self._spark.id, payload.id, iterator)
    return forAwaitEach(iterator, function (val) {
      self._handleSubscriptionIteratorNext(callbacks, val)
    }).then(function () {
      self._handleSubscriptionIteratorCompleted(callbacks, payload)
    })
  }).catch(function (err) {
    self._handleSubscriptionError(callbacks, payload, err)
  })
}

DataHandler.prototype._handleSubscriptionError = function (callbacks, payload, err) {
  // error: subscribe or iterator
  if (!this._spark) return
  // write to socket first, before removing
  callbacks.onError(err)
  activeIterators.remove(this._spark.id, payload.id)
}

DataHandler.prototype._handleSubscriptionIteratorCompleted = function (callbacks, payload) {
  // iterator: completed
  // check if spark has disconnected
  if (!this._spark) return
  // write to socket first, before removing
  callbacks.onCompleted()
  activeIterators.remove(this._spark.id, payload.id)
}

DataHandler.prototype._handleSubscriptionIteratorNext = function (callbacks, val) {
  // iterator: next
  // check if spark has disconnected
  if (!this._spark) return
  callbacks.onNext(val.data)
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
    return false
  }
  var match = queryRE.exec(query)
  // index 1 is group 1
  return match[1]
}
