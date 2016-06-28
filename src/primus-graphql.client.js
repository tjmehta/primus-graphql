/*
  note: this is a partial script see "make build"
  the build is necessary to keep module.exports functional, but also bundle all dependencies into a single file
*/

var EventEmitter = require('events').EventEmitter

var maybe = require('call-me-maybe')
var defaults = require('101/defaults')
var isFunction = require('101/is-function')
var uuid = require('uuid')

var defaultOpts = require('./default-opts.js')

var resEE = new EventEmitter()

primusOpts = primusOpts || {}
defaults(primusOpts, defaultOpts)
var key = primusOpts.key

/**
 * @param  {Query } query graphql query
 * @param  {Object} [vars]  graphql query args, optional
 * @param  {Object} [files]  graphql query files, optional
 * @param  {Object} [cb]  callback, optional
 * @return {Promise<Object,Error>|null}
 */
primus.graphql = function (query, vars, files, cb) {
  var payload = {}
  if (isFunction(vars)) {
    cb = vars
    vars = null
    files = null
  }
  if (isFunction(files)) {
    cb = files
    files = null
  }
  payload.id = uuid()
  payload.query = query
  payload.variables = vars
  payload.files = files
  // Setup data handler
  if (!~primus.listeners('data').indexOf(handleData)) {
    primus.on('data', handleData)
  }
  // Make request
  var data = {}
  data[key] = payload
  var success = primus.write(data)
  var promise
  if (!success) {
    promise = Promise.reject(new Error('primus-graphql: write failed'))
    return maybe(cb, promise)
  }
  // Response promise
  promise = new Promise(function (resolve, reject) {
    resEE.once(payload.id, resolve)
  })
  return maybe(cb, promise)
}

function handleData (res) {
  var payload = res[key]
  if (payload) {
    resEE.emit(payload.id, payload)
  }
}
