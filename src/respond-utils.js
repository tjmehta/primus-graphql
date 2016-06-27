var assign = require('101/assign')
var debug = require('debug')('primus-graphql:respond-utils')
var omit = require('101/omit')

module.exports.respond = respond
module.exports.respondErrs = respondErrs

/**
 * respond to a graphql request
 * @param  {Spark} spark
 * @param  {String} id
 * @param  {Integer} statusCode
 * @param  {Object} payload response payload
 */
function respond (spark, id, statusCode, data, opts, primusOpts) {
  debug('respond' + data)
  var key = primusOpts.key
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
function respondErrs (spark, id, statusCode, errors, opts, primusOpts) {
  debug('respondErrs: ' + errors)
  try {
    errors = (opts.formatError)
      ? errors.map(opts.formatError)
      : errors
  } catch (err) {
    return respondErrs(spark, id, statusCode, [err], omit(opts, 'formatError'), primusOpts)
  }
  module.exports.respond(spark, id, statusCode, { errors: errors }, opts, primusOpts)
}
