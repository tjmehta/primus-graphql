var assert = require('assert')
var debug = require('debug')('primus-graphql:query-executor')
var isFunction = require('101/is-function')
var keypather = require('keypather')()
var hasProps = require('101/has-properties')
var GraphQL = require('graphql')
var graphqlKinds = require('graphql/language/kinds.js')
var PromisedObservable = require('promised-observable')
var StaticObservable = require('static-observable')

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
Executor._parseQuery = function (query) {
  debug('_parseQuery:', query)
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

/**
 * get subscription field
 * @param  {Object} schema
 * @param  {Object} documentAST
 * @return {Field} subscriptionField
 */
Executor._getSubscriptionField = function (schema, documentAST) {
  try {
    // check ast
    assert(documentAST.definitions.length === 1, 'subscription query: only supports a single definition')
    var definition = documentAST.definitions[0]
    assert(definition.operation === 'subscription', 'subscription query: query operation must be "subscription"')
    var rootField = keypather.get(definition,
      'selectionSet.selections.find(%)', hasProps({ kind: graphqlKinds.FIELD }))
    assert(rootField, 'subscription query: subscription should have a root field"')
    // check schema
    var subscriptionName = rootField.name.value
    var subscriptionField = keypather.get(schema, '_subscriptionType._fields["' + subscriptionName + '"]')
    assert(subscriptionField, '"' + subscriptionName + '" subscription not found in schema')
    assert(subscriptionField.observe, '"' + subscriptionName + '" observe not implemented in schema')
  } catch (_err) {
    var err = new Error('subscription validation error')
    err.statusCode = 400
    err.errors = [_err]
    throw err
  }
  return subscriptionField
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
    var documentAST = Executor._parseQuery(query)
    // validate ast
    Executor._validateAST(documentAST, opts)
    // resolve options
    context = Executor._resolveOpt(context, spark)
    rootValue = _rootValue || Executor._resolveOpt(rootValue, spark)
    // execute
    debug('GraphQL.execute:')
    GraphQL.execute(schema, documentAST, rootValue, context, variables)
      .then(resolve)
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
    var documentAST = Executor._parseQuery(payload.query)
    Executor._validateAST(documentAST, this._opts)
    var subscriptionField = Executor._getSubscriptionField(this._opts.schema, documentAST)
    // TODO: input_0
    var ret = subscriptionField.observe(payload.variables.input_0)
    if (ret && isFunction(ret.then)) {
      var promise = ret
      return new PromisedObservable(promise)
    }
    assert(!ret || isFunction(ret.subscribe), 'observe: expected subscription.observe to return an observable (or promise)')
    // ret is an observable
    var observable = ret
    return observable
  } catch (err) {
    return StaticObservable.error(err)
  }
}
