var assert = require('assert')

var errToJSON = require('error-to-json')
var debug = require('debug')('primus-graphql:server')
var defaults = require('101/defaults')

var defaultPrimusOpts = require('./default-primus-opts.js')
var DataHandler = require('./server/data-handler.js')

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
    // setup opts on spark - used in handleData
    primus.Spark.prototype.__graphql = {
      opts: opts,
      primusOpts: primusOpts
    }
    primus.Spark.prototype.attachGraphQLDataHandler = function () {
      debug('attachGraphQLDataHandler')
      var spark = this
      if (spark.__graphqlDataHandler) return
      debug('attachGraphQLDataHandler: create data handler')
      var dataHandler = new DataHandler(opts, primusOpts)
      spark.__graphqlDataHandler = dataHandler
      dataHandler.listenToSpark(spark)
    }
    primus.Spark.prototype.detachGraphQLDataHandler = function () {
      var spark = this
      var dataHandler = spark.__graphqlDataHandler
      if (!dataHandler) return
      dataHandler.stopListeningToSpark()
      delete spark.__graphqlDataHandler
    }
    primus.graphql = function () {
      if (!this.__graphqlListening) {
        this.__graphqlListening = true
        this.on('connection', function (spark) {
          spark.attachGraphQLDataHandler()
        })
        this.on('disconnection', function (spark) {
          spark.detachGraphQLDataHandler()
        })
      }
    }
    primus.graphql()
  }
}
