/*
  note: this is a partial script see "make build"
  the build is necessary to keep module.exports functional, but also bundle all dependencies into a single file
*/

var EventEmitter = require('events').EventEmitter

var defaults = require('101/defaults')
var maybe = require('call-me-maybe')
var uuid = require('uuid')

var defaultOpts = require('./default-opts.js')

var resEE = new EventEmitter()

primusOpts = primusOpts || {}
defaults(primusOpts, defaultOpts)
var key = primusOpts.key

/**
 * @param  {Query } query graphql query
 * @param  {Object} [vars]  graphql query args, optional
 * @param  {Object} [cb]  callback, optional
 * @return {Promise<Object,Error>|null}
 */
primus.graphql = function (query, vars, cb) {
  var payload = {}
  payload.id = uuid()
  payload.query = query
  payload.variables = vars
  // Make request
  var promise = new Promise(function (resolve, reject) {
    resEE.once(payload.id, resolve)
  })
  var data = {}
  data[key] = payload
  primus.write(data)
  if (!~primus.listeners('data').indexOf(handleData)) {
    primus.on('data', handleData)
  }
  return maybe(cb, promise)
}

function handleData (res) {
  var payload = res[key]
  if (payload) {
    resEE.emit(payload.id, payload)
  }
}
