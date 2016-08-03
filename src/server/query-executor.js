var assert = require('assert')
var debug = require('debug')('primus-graphql:query-executor')
var isFunction = require('101/is-function')
var GraphQL = require('graphql')
var PromisedObservable = require('promised-observable')
var StaticObservable = require('static-observable')

var graphqlObserve = require('./graphql-observe.js')

var checkForPayloadErrors = function (data) {
  if (data.errors) {
    if (data.errors.length === 1) {
      throw data.errors[0]
    }
    var err = new Error('multiple errors')
    err.errors = data.errors
    throw err
  }
}

module.exports = Executor

function Executor (spark, opts, primusOpts) {
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
Executor.parseQuery = function (query) {
  debug('parseQuery:', query)
  var source = new GraphQL.Source(query, 'GraphQL request')
  return GraphQL.parse(source)
}

/**
 * resolve query options
 * @param  {Function|*} option   primus-graphql plugin option
 * @return {Object} resolvedOpts
 */
Executor._resolveOpt = function (opt, spark) {
  debug('_resolveOpt:')
  return isFunction(opt) ? opt(spark) : opt
}

/**
 * validate graphql document ast w/ default and custom validation rules
 * @param  {Object} schema  graphql schema
 * @param  {Object} documentAST  graphql query document ast
 * @param  {Object} opts  primus-graphql opts
 * @param  {Object} opts.schema graphql schema
 * @param  {Object} opts.validationRules  custom graphql query validation rules
 */
Executor._validateAST = function (documentAST, opts) {
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
Executor.prototype.execute = function (payload, _rootValue) {
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
    var documentAST = Executor.parseQuery(query)
    // validate ast
    Executor._validateAST(documentAST, opts)
    // resolve options
    context = Executor._resolveOpt(context, spark)
    rootValue = _rootValue || Executor._resolveOpt(rootValue, spark)
    // execute
    debug('GraphQL.execute:')
    GraphQL.execute(schema, documentAST, rootValue, context, variables)
      .then(function (data) {
        checkForPayloadErrors(data)
        resolve(data)
      })
      .catch(reject)
  })
}

/**
 * get observable for subscription
 * @param  {Object} schema graphql schema
 * @param  {Object} payload primus-graphql subscription payload
 * @return {Observable} subscriptionObservable
 */
Executor.prototype.observe = function (payload) {
  debug('observe:', payload.id, payload.query, payload.variables)
  assert(payload.query, '"query" is required')
  try {
    var spark = this._spark
    var opts = this._opts
    // payload parts
    var query = payload.query
    var variables = payload.variables
    // primus-graphql opts
    var schema = opts.schema
    var context = opts.context
    var rootValue = opts.rootValue
    // parse query
    var documentAST = Executor.parseQuery(query)
    // validate ast
    Executor._validateAST(documentAST, opts)
    // resolve options
    context = Executor._resolveOpt(context, spark)
    rootValue = Executor._resolveOpt(rootValue, spark)
    // execute
    debug('graphqlObserve:')
    var promise = graphqlObserve(schema, documentAST, rootValue, context, variables).then(function (data) {
      checkForPayloadErrors(data)
      return data.data
    })
    return new PromisedObservable(promise)
  } catch (err) {
    return StaticObservable.error(err)
  }
}
