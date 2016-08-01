var assert = require('assert')

var errToJSON = require('error-to-json')
var debug = require('debug')('primus-graphql:server')
var defaults = require('101/defaults')

var defaultOpts = require('./default-opts.js')
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
  return function serverPlugin (Primus, primusOpts) {
    primusOpts = primusOpts || {}
    defaults(primusOpts, defaultOpts)
    // setup opts on spark - used in handleData
    Primus.Spark.prototype.__graphql = {
      opts: opts,
      primusOpts: primusOpts
    }
    Primus.Spark.prototype.graphql = function () {
      debug('graphql')
      var spark = this
      if (!spark.__graphqlDataHandler) {
        debug('graphql attach "data" handler')
        var dataHandler = spark.__graphqlDataHandler = new DataHandler(spark, opts, primusOpts)
        spark.on('data', dataHandler.handleData)
        spark.on('close', dataHandler.handleClose)
      }
    }
  }
}
