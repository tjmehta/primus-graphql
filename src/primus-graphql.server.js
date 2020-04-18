var assert = require('assert')

var bindAll = require('101/bind-all')
var errToJSON = require('error-to-json')
var debug = require('debug')('primus-graphql:server')
var defaults = require('101/defaults')

var defaultPrimusOpts = require('./default-primus-opts.js')
var DataHandler = require('./server/data-handler.js')
var values = require('./shared/values.js')

module.exports = createServerPlugin

/**
 * create primus graphql primus server plugin
 * @param  {Object|Function} opts options or function which returns options
 * @param  {Object} opts.schema A GraphQLSchema instance from graphql-js
 * @param  {*} [opts.context] A value to pass as the context to the graphql() function from graphql-js
 * @param  {*} [opts.rootValue] A value to pass as the rootValue to the graphql() function from graphql-js
 * @param  {Function} [opts.formatError] function which will be used to format any errors produced by fulfilling a GraphQL operation.
 * @param  {Function} [opts.validationRules] additional validation rules queries must satisfy in addition to those defined by the GraphQL spec.
 */
function createServerPlugin (opts) {
  assert(opts, 'primus-graphql: "opts" is required')
  assert(opts.schema, 'primus-graphql: "opts.schema" is required')
  defaults(opts, {
    formatError: errToJSON,
    validationRules: []
  })
  return function serverPlugin (primus, primusOpts) {
    primusOpts = primusOpts || {}
    defaults(primusOpts, defaultPrimusOpts)
    primus.graphql = new PrimusGraphQL(primus, opts, primusOpts)
    primus.graphql.start()
  }
}

function PrimusGraphQL(primus, opts, primusOpts) {
  this._primus = primus
  this._opts = opts
  this._primusOpts = primusOpts
  this._dataHandlers = {}
  this._disconnectPromises = {}
  bindAll(this, [
    '_handleConnection',
    '_handleDisconnection'
  ])
}
PrimusGraphQL.prototype.start = function () {
  this._primus.on('connection', this._handleConnection)
  this._primus.on('disconnection', this._handleDisconnection)
  return Promise.resolve()
}
PrimusGraphQL.prototype.stop = function () {
  const self = this
  self._primus.removeListener('connection', self._handleConnection)
  self._primus.removeListener('disconnection', self._handleDisconnection)
  const promises = values(self._disconnectPromises).concat(Object.keys(self._dataHandlers).map(function (sparkId) {
    return this._stopListeningToSpark(self._dataHandlers[sparkId], sparkId)
  }))
  return Promise.all(promises)
}
PrimusGraphQL.prototype._handleConnection = function (spark) {
  const dataHandler = this._dataHandlers[spark.id] = new DataHandler(this._opts, this._primusOpts)
  dataHandler.listenToSpark(spark)
}
PrimusGraphQL.prototype._handleDisconnection = function (spark) {
  const dataHandler = this._dataHandlers[spark.id]
  if (!dataHandler) return
  this._stopListeningToSpark(dataHandler, spark.id)
}
PrimusGraphQL.prototype._stopListeningToSpark = function (dataHandler, sparkId) {
  const self = this
  const promise = this._disconnectPromises[sparkId] = dataHandler.stopListeningToSpark()
    .then(function (val) {
      // no catch required, bc uses allSettled
      delete self._dataHandlers[sparkId]
      delete self._disconnectPromises[sparkId]
      return val
    })
  return promise
}
