import assert from 'assert'

import errToJSON from 'error-to-json'
import Debug from 'debug'
import defaults from '101/defaults'

import defaultPrimusOpts from './default-primus-opts.js'
import DataHandler from './server/data-handler.js'
import values from './shared/values.js'

const debug = Debug('primus-graphql:server')

export default createServerPlugin

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
  opts = {
    formatError: errToJSON,
    validationRules: [],
    ...opts
  })
  return function serverPlugin (primus, primusOpts) {
    primusOpts = primusOpts || {}
    defaults(primusOpts, defaultPrimusOpts)
    primus.graphql = new PrimusGraphQL(primus, opts, primusOpts)
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
  debug('start primus graphql')
  this._primus.on('connection', this._handleConnection)
  this._primus.on('disconnection', this._handleDisconnection)
  debug('start primus graphql: success')
  return Promise.resolve()
}
PrimusGraphQL.prototype.stop = function () {
  debug('stop primus graphql')
  const self = this
  self._primus.removeListener('connection', self._handleConnection)
  self._primus.removeListener('disconnection', self._handleDisconnection)
  const promises = values(self._disconnectPromises).concat(Object.keys(self._dataHandlers).map(function (sparkId) {
    return self._stopListeningToSpark(self._dataHandlers[sparkId], sparkId)
  }))
  return Promise.all(promises).then(function (val) {
    debug('stop primus graphql: success')
    return val
  }).catch(function (err) {
    debug('stop primus graphql: error')
    throw err
  })
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
  debug('stop listening to spark')
  const self = this
  this._disconnectPromises[sparkId] = this._disconnectPromises[sparkId] || dataHandler.stopListeningToSpark()
    .then(function (val) {
      debug('stop listening to spark: finally', { val })
      // no catch required, bc uses allSettled
      delete self._dataHandlers[sparkId]
      delete self._disconnectPromises[sparkId]
      return val
    })
  return this._disconnectPromises[sparkId]
}
