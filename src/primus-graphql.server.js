var assert = require('assert')

var assign = require('101/assign')
var errToJSON = require('error-to-json')
var debug = require('debug')('primus-graphql:server')
var defaults = require('101/defaults')
var isFunction = require('101/is-function')
var graphql = require('graphql')

var defaultOpts = require('./default-opts.js')

var execute = graphql.execute
var parse = graphql.parse
var Source = graphql.Source
var specifiedRules = graphql.specifiedRules
var validate = graphql.validate

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
          return respondErrs(spark, id, 400, [ err ], opts)
        }
        // Parse query, reporting any errors.
        debug('parse query')
        var source = new Source(query, 'GraphQL request')
        var documentAST
        try {
          documentAST = parse(source)
        } catch (syntaxError) {
          // Respond 400: Bad Request if any syntax errors errors exist.
          debug('query syntax err: ' + err)
          return respondErrs(spark, id, 400, [ syntaxError ], opts)
        }
        // Validate AST, reporting any errors.
        debug('validate')
        var validationErrors = validate(opts.schema, documentAST, specifiedRules.concat(opts.validationRules))
        if (validationErrors.length > 0) {
          // Respond 400: Bad Request if any validation errors exist.
          debug('validation errs: ' + validationErrors)
          return respondErrs(spark, id, 400, validationErrors, opts)
        }
        // Perform the execution, reporting any errors creating the context.
        debug('execute')
        execute(opts.schema, documentAST, rootValue, context, variables, operationName)
          .then(function (payload) {
            respond(spark, id, 200, payload)
          }).catch(function (err) {
            respondErrs(spark, id, statusCode, [ err ], opts)
          })
      }
    }
    /**
     * respond to a graphql request
     * @param  {Spark} spark
     * @param  {String} id
     * @param  {Integer} statusCode
     * @param  {Object} payload response payload
     */
    function respond (spark, id, statusCode, data) {
      debug('respond' + data)
      var res = {}
      res[key] = {
        id: id,
        statusCode: statusCode
      }
      assign(res[key], data)
      spark.write(res)
    }
    /**
     * respond to a graphql request w/ errors
     * @param  {Spark} spark
     * @param  {String} id
     * @param  {Integer} statusCode
     * @param  {Error} response error
     * @param  {Object} options
     */
    function respondErrs (spark, id, statusCode, errors, opts) {
      debug('respondErrs: ' + errors)
      try {
        errors = (opts.formatError)
          ? errors.map(opts.formatError)
          : errors
      } catch (err) {
        return respondErrs(spark, id, statusCode, [err])
      }
      respond(spark, id, statusCode, { errors: errors })
    }
  }
}
