var assert = require('assert')

var bindAll = require('101/bind-all')
var debug = require('debug')('primus-graphql:data-handler')
var forAwaitEach = require('iterall').forAwaitEach

var ActiveIterators = require('./active-iterators.js')
var QueryExecutor = require('./query-executor.js')
var SubscribeCallbacks = require('./subscribe-callbacks.js')
var Responder = require('./responder.js')
var Responder = require('./responder.js')
var values = require('../shared/values.js')
var allSettled = require('../shared/allSettled.js')

module.exports = DataHandler

function DataHandler (opts, primusOpts) {
  debug('DataHandler:', 'spark', opts, primusOpts)
  this._spark = null
  this._opts = opts
  this._primusOpts = primusOpts
  // models
  this._activeIterators = null
  this._activePromises = null
  this._queryExecutor = null
  this._responder = null
  // bind data handler
  bindAll(this, [
    'handleData',
    '_handleEvent',
    'handleClose',
    '_handleSubscription',
  ])
}

/**
 * listen to spark events
 */
DataHandler.prototype.listenToSpark = function (spark) {
  assert(!this._spark, 'already listening to spark: ' + spark.id)
  this._spark = spark
  // create helpers
  this._activeIterators = new ActiveIterators()
  this._activePromises = {}
  this._queryExecutor = new QueryExecutor(spark, this._opts, this._primusOpts)
  this._responder = new Responder(spark, this._opts, this._primusOpts)
  // listen to spark events
  spark.on('data', this.handleData)
}

DataHandler.prototype.stopListeningToSpark = function () {
  if (!this._spark) return Promise.resolve()
  this._spark = null
  const promise = allSettled(values(this._activePromises))
  this._activeIterators.unsubscribeAll()
  return promise
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
    this._activeIterators.unsubscribe(this._spark.id, payload.id)
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
  var promiseId = [this._spark.id, payload.id].join(':')
  var promise = this._activePromises[promiseId] = this._queryExecutor.execute(payload)
    .then(function (resPayload) {
      // check if spark has disconnected
      delete self._activePromises[promiseId]
      if (!self._spark) return
      self._responder.send(id, 200, resPayload)
    }).catch(function (err) {
      // check if spark has disconnected
      // this line is covered... not sure what is going on
      /* istanbul ignore next */
      delete self._activePromises[promiseId]
      if (!self._spark) return
      self._responder.sendErrs(id, err.status, [err])
    })
  return promise
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
  var promiseId = [this._spark.id, payload.id].join(':')
  var promise = this._activePromises[promiseId] = this._queryExecutor.subscribe(payload)
  return  promise.then(function (iterator) {
    // check if spark has disconnected
    delete self._activePromises[promiseId]
    if (!self._spark) {
      iterator.return()
      return
    }
    self._activeIterators.add(self._spark.id, payload.id, iterator)
    // add to active iterators and await results
    return forAwaitEach(iterator, function (val) {
      // iterator: next
      // check if spark has disconnected
      if (!self._spark) {
        iterator.return()
        return
      }
      callbacks.onNext(val.data)
    }).then(function () {
      // iterator: completed
      // check if spark has disconnected
      if (!self._spark) return
      self._activeIterators.remove(self._spark.id, payload.id)
      callbacks.onCompleted()
    })
  }).catch(function (err) {
    // error: subscribe or iterator
    delete self._activePromises[promiseId]
    if (!self._spark) return
    self._activeIterators.remove(self._spark.id, payload.id)
    callbacks.onError(err)
  })
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
