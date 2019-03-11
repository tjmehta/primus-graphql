var assert = require('assert')
var debug = require('debug')('primus-graphql:query-executor')
var isFunction = require('101/is-function')
var GraphQL = require('graphql')

var getErrorStatus = function (err, defaultStatus) {
  if (err.status) return err.status
  if (err.originalError && err.originalError.status) return err.originalError.status
  return defaultStatus
}

var checkForPayloadErrors = function (data) {
  if (data.data instanceof Error) {
    throw data.data
  }

  var err
  if (data.errors) {
    if (data.errors.length === 1) {
      err = data.errors[0]
      err.status = getErrorStatus(err, 400)
    } else {
      err = new Error('multiple errors')
      const statuses = data.errors.map((err) => getErrorStatus(err, 400))
      err.status = Math.max.apply(Math, statuses)
      err.errors = data.errors
    }
    throw err
  }
}

module.exports = QueryExecutor

function QueryExecutor (spark, opts, primusOpts) {
  this._spark = spark
  this._opts = opts
  this._key = primusOpts.key
  assert(opts.schema, '"schema" is required')
}

// static methods

/**
 * parse query options
 * @param {String} graphql query
 * @return {DocumentAST} graphql document ast
 */
QueryExecutor.parseQuery = function (query) {
  debug('parseQuery:', query)
  var source = new GraphQL.Source(query, 'GraphQL request')
  return GraphQL.parse(source)
}

/**
 * resolve query options
 * @param  {Function|*} option   primus-graphql plugin option
 * @return {Object} resolvedOpts
 */
QueryExecutor._resolveOpt = function (opt, spark) {
  debug('_resolveOpt:')
  return isFunction(opt) ? opt(spark) : opt
}

/**
 * validate graphql document ast w/ default and custowalm validation rules
 * @param  {Object} schema  graphql schema
 * @param  {Object} documentAST  graphql query document ast
 * @param  {Object} opts  primus-graphql opts
 * @param  {Object} opts.schema graphql schema
 * @param  {Object} opts.validationRules  custom graphql query validation rules
 */
QueryExecutor._validateAST = function (documentAST, opts) {
  debug('_validateAST:')
  var schema = opts.schema
  var validationRules = opts.validationRules || []
  var allValidationRules = GraphQL.specifiedRules.concat(validationRules)
  var validationErrors = GraphQL.validate(schema, documentAST, allValidationRules)
  if (validationErrors.length) {
    debug('_validateAST: errors:', validationErrors)
    var err = new Error('validation error')
    err.status = 400
    err.errors = validationErrors
    throw err
  }
}

// instance methods

/**
 * execute payload query and resolve result
 * @param {Object} payload  primus-graphql query payload
 * @return {Promise<Object,Error>} query result
 */
QueryExecutor.prototype.execute = function (payload) {
  debug('execute:', payload)
  var spark = this._spark
  var opts = this._opts
  return new Promise(function (resolve, reject) {
    // payload parts
    var query = payload.query
    var variables = payload.variables
    // primus-graphql opts
    var schema = opts.schema
    var context = opts.context
    var rootValue = opts.rootValue
    // parse query
    var documentAST = QueryExecutor.parseQuery(query)
    // validate ast
    QueryExecutor._validateAST(documentAST, opts)
    // resolve options
    context = QueryExecutor._resolveOpt(context, spark)
    rootValue = QueryExecutor._resolveOpt(rootValue, spark)
    // execute
    debug('GraphQL.execute:')
    return Promise.resolve().then(function () {
      try {
        return GraphQL.execute(schema, documentAST, rootValue, context, variables)
      } catch (err) {
        // Return 400: Bad Request if any execution context errors exist.
        err.status = 400
        reject(err)
      }
    }).then(function (data) {
      // GraphQL.execute
      checkForPayloadErrors(data)
      resolve(data)
    })
    .catch(reject)
  })
}

/**
 * get async iterator for subscription
 * @param  {Object} schema graphql schema
 * @param  {Object} payload primus-graphql subscription payload
 * @return {Promise<AsyncIterator<ExecutionResult>>} subscriptionIterator
 */
QueryExecutor.prototype.subscribe = function (payload) {
  debug('subscribe:', payload.id, payload.query, payload.variables)
  assert(payload.query, '"query" is required')
  var spark = this._spark
  var opts = this._opts
  return new Promise(function (resolve, reject) {
    // payload parts
    var query = payload.query
    var variables = payload.variables
    // primus-graphql opts
    var schema = opts.schema
    var context = opts.context
    var rootValue = opts.rootValue
    // parse query
    var documentAST = QueryExecutor.parseQuery(query)
    // validate ast
    QueryExecutor._validateAST(documentAST, opts)
    // resolve options
    context = QueryExecutor._resolveOpt(context, spark)
    rootValue = QueryExecutor._resolveOpt(rootValue, spark)
    // execute
    debug('GraphQL.subscribe:')
    GraphQL.subscribe(schema, documentAST, rootValue, context, variables)
      .then(function (iterator) {
        checkForPayloadErrors(iterator)
        resolve(iterator)
      })
      .catch(reject)
  })
}
