var assert = require('assert')

var errToJSON = require('error-to-json')
var debug = require('debug')('primus-graphql:server')
var defaults = require('101/defaults')
var isFunction = require('101/is-function')
var graphql = require('graphql')

var defaultOpts = require('./default-opts.js')
var utils = require('./respond-utils.js')

var execute = graphql.execute
var parse = graphql.parse
var Source = graphql.Source
var specifiedRules = graphql.specifiedRules
var validate = graphql.validate

var respond = utils.respond
var respondErrs = utils.respondErrs

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
    var key = primusOpts.key
    Primus.Spark.prototype.graphql = function () {
      debug('graphql')
      if (!~this.listeners('data').indexOf(handleData)) {
        debug('graphql attach "data" listener')
        this.on('data', handleData)
      }
    }
    /**
     * check primus data and handle graphql data
     * @param  {Object} data primus data
     */
    function handleData (data) {
      var spark = this
      if (data[key]) {
        debug('handle graphql data')
        // Data is a Primus-GraphQL request
        var payload = data[key]
        var id = payload.id
        var query = payload.query
        var variables = payload.variables
        var operationName = payload.operationName
        var context
        var rootValue
        // Options
        debug('parse options')
        try {
          assert(id, 'primus-graphql: "id" is required')
          context = isFunction(opts.context)
            ? opts.context(spark)
            : opts.context
          rootValue = isFunction(opts.rootValue)
            ? opts.rootValue(spark)
            : opts.rootValue
        } catch (err) {
          debug('context or root err: ' + err)
          return respondErrs(spark, id, 400, [ err ], opts, primusOpts)
        }
        // Parse query, reporting any errors.
        debug('parse query')
        var source
        var documentAST
        try {
          source = new Source(query, 'GraphQL request')
          documentAST = parse(source)
        } catch (syntaxError) {
          // Respond 400: Bad Request if any syntax errors errors exist.
          debug('query syntax err: ' + syntaxError)
          return respondErrs(spark, id, 400, [ syntaxError ], opts, primusOpts)
        }
        // Validate AST, reporting any errors.
        debug('validate')
        var validationErrors = validate(opts.schema, documentAST, specifiedRules.concat(opts.validationRules))
        if (validationErrors.length > 0) {
          // Respond 400: Bad Request if any validation errors exist.
          debug('validation errs: ' + validationErrors)
          return respondErrs(spark, id, 400, validationErrors, opts, primusOpts)
        }
        // Perform the execution, reporting any errors creating the context.
        debug('execute')
        execute(opts.schema, documentAST, rootValue, context, variables, operationName)
          .then(function (payload) {
            respond(spark, id, 200, payload, opts, primusOpts)
          }).catch(function (err) {
            respondErrs(spark, id, 400, [ err ], opts, primusOpts)
          })
      }
    }
  }
}
