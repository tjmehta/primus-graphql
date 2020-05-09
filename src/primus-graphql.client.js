/*
  note: this is a partial script see "make build"
  the build is necessary to keep module.exports functional, but also bundle all dependencies into a single file
*/

var Emitter = require('mitt')

var debug = require('debug')('primus-graphql:client')
var defaults = require('101/defaults')
var equals = require('101/equals')
var isFunction = require('101/is-function')
var maybe = require('call-me-maybe')
var not = require('101/not')
var parseErr = require('error-to-json').parse
var uuid = require('uuid/v4')

var defaultPrimusOpts = require('./default-primus-opts.js')
var SubscriptionObservable = require('./client/subscription-observable.js')
// observable operators: used in relay-network-layer, but has to be bundled w/ client
require('rxjs/add/operator/publish')
require('observable-backoff')

var notEquals = not(equals)
var resEE = new Emitter()

/* istanbul ignore next */
primusOpts = primusOpts || {}
defaults(primusOpts, defaultPrimusOpts)
var key = primusOpts.key

/**
 * @param  {String} query graphql query
 * @param  {Object} [vars]  graphql query args, optional
 * @param  {Object} [files]  graphql query files, optional
 * @param  {String} [operationName]  graphql operation name for advanced operations like batching
 * @param  {Object} [cb]  callback, optional
 * @return {Promise<Object,Error>|Observable|null}
 */
primus.graphql = function (query, vars, files, operationName, cb) {
  debug('graphql', query, vars)
  if (isFunction(vars)) {
    cb = vars
    vars = undefined
    files = undefined
  }
  if (isFunction(files)) {
    cb = files
    files = undefined
  }
  if (isFunction(operationName)) {
    cb = operationName
    operationName = undefined
  }
  // parse query operation
  var end = Math.min.apply(Math, [query.indexOf(' '), query.indexOf('{')].filter(notEquals(-1)))
  var queryOperation = query.slice(0, end)
  // create payload
  var payload = {}
  payload.id = uuid()
  payload.query = query
  payload.variables = vars
  payload.operationName = operationName
  if (files) {
    payload.files = files
  }
  // Setup data handler
  if (!~primus.listeners('data').indexOf(handleData)) {
    primus.on('data', handleData)
  }
  // Make request
  var data = {}
  data[key] = payload
  if (queryOperation === 'subscription') {
    // subscription returns an observable
    if (cb) throw new Error('cannot use callbacks for subscriptions (returns an observable)')
    return this._observeGraphQL(data)
  } else {
    // query, mutation, or malformatted
    var promise
    var err
    debug('write', data)
    var writeSuccess = primus.write(data)
    if (!writeSuccess) {
      // Request failed
      err = new Error('primus-graphql: write failed')
      return maybe(cb, Promise.reject(err))
    }
    // Response promise
    promise = new Promise(function (resolve, reject) {
      function handle() {
        resEE.off(payload.id, handle)
        resolve()
      }
      resEE.on(payload.id, handle)
    })
    return maybe(cb, promise)
  }
}

primus._observeGraphQL = function (data) {
  debug('_observe', data)
  return new SubscriptionObservable(primus, resEE, data, primusOpts)
}

function handleData (res) {
  debug('handleData', res)
  var payload = res[key]
  if (payload) {
    if (payload.errors) {
      payload.errors = payload.errors.map(parseErr)
    }
    resEE.emit(payload.id, payload)
  }
}
