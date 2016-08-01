var assert = require('assert')

var assign = require('101/assign')
var debug = require('debug')('primus-graphql:responder')
var omit = require('101/omit')

module.exports = Responder

function Responder (spark, opts, primusOpts) {
  this._spark = spark
  this._opts = opts
  this._key = primusOpts.key
}

/**
 * respond to a graphql request
 * @param  {String} id
 * @param  {Integer} statusCode
 * @param  {Object} payload response payload
 */
Responder.prototype.send = function (id, statusCode, payload) {
  debug('respond:', id, statusCode, payload)
  var key = this._key
  var data = {}
  data[key] = {
    id: id,
    statusCode: statusCode
  }
  assign(data[key], payload)
  this._spark.write(data)
}

/**
 * respond to a graphql request w/ errors
 * @param  {String} id
 * @param  {Integer} statusCode
 * @param  {Array<Error>} errors
 */
Responder.prototype.sendErrs = function (id, statusCode, errors, _event, _dontFormat) {
  debug('respondErrs:', errors)
  var opts = this._opts
  var payload = {}
  statusCode = statusCode || 500
  try {
    errors = (!_dontFormat && opts.formatError)
      ? errors.map(opts.formatError)
      : errors
    payload = { errors: errors }
    if (_event) {
      payload.event = _event
    }
    this.send(id, statusCode, payload)
  } catch (err) {
    this.sendErrs(id, err.statusCode, errors.concat(err), _event, true)
  }
}

/**
 * respond to a graphql request
 * @param  {String} id
 * @param  {Integer} statusCode
 * @param  {Object} event name
 * @param  {Object} payload response payload
 */
Responder.prototype.sendEvent = function (id, event, data) {
  debug('respondEvent:', event, data)
  var err
  var errors
  var statusCode = 200 // next, completed
  var payload = {
    event: event
  }
  if (event === 'next' || event === 'completed') {
    if (data) {
      payload.data = data
    }
    this.send(id, statusCode, payload)
  } else {
    assert(event === 'error', 'unknown event: ' + event + ' (' + id + ')')
    errors = data.errors || [data]
    err = errors[0]
    statusCode = err.statusCode || 500
    this.sendErrs(id, statusCode, errors, event)
  }
  debug('unknownEvent:', id, event, data)
}
