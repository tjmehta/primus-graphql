var assert = require('assert')

var exists = require('101/exists')
var defaults = require('101/defaults')
var put = require('101/put')
var retry = require('promise-retry')
var warning = require('warning')
// observable operators: required in primus-graphql.client

var errWarnMessage = function (err) {
  if (err.stack) {
    return err.stack
  }
  var msg = err.message || ''
  msg = 'Error: ' + msg
  if (msg.length < 10) {
    // note: warning needs an message gte 10
    msg += '___' // 'Error: '.length == 7
  }
  return msg
}

var timeout = function (time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time)
  })
}

module.exports = PrimusRelayClient

function PrimusRelayClient (primus, opts) {
  assert(primus, '`primus` is required')
  this.primus = primus
  this.opts = defaults(opts, {
    timeout: 15000,
    retry: {}
  })
  defaults(this.opts.retry, {
    minTimeout: 1000,
    maxTimeout: 3000,
    factor: 3,
    retries: 2
  })
  // bind methods
  this.fetch = this.fetch.bind(this)
  this.subscribe = this.subscribe.bind(this)
}

/**
 * fetch a graphql query over primus
 * @param  {object} operation
 * @param  {object} variables
 * @param  {object} cacheConfig - not supported yet
 */
PrimusRelayClient.prototype.fetch = function (operation, variables, cacheConfig) {
  var self = this
  var opts = this.opts
  var primus = this.primus

  // fetch query with retries
  return retry(function (retryCb, count) {
    // race timeout error with graphql request
    return Promise.race([
      timeout(opts.timeout).then(function () {
        var errReason = 'fetch(): Request timed out'
        var source = {
          errors: [new Error('Request timed out')],
          retryable: true
        }
        throw self._createErr(errReason, count, source, {
          operation,
          variables
        })
      }),
      primus.graphql(operation.text, variables)
    ]).catch(retryCb).then(function (payload) {
      // response payload recieved
      if (!payload.statusCode || payload.statusCode >= 300 || payload.statusCode < 200) {
        // error
        var errReason = 'fetch(): Received error response from server'
        const err = self._createErr(errReason, count, payload, {
          operation,
          variables
        })
        if (!payload.statusCode || payload.statusCode >= 500) {
          // retryable
          retryCb(err)
        } else {
          return Promise.reject(err)
        }
      } else { // assume statusCode >= 200
        // success
        return payload
      }
    })
  }, opts.retry)
}

/**
 * subscribe to a graphql subscription over primus
 * @param  {object} operation
 * @param  {object} variables
 * @param  {object} cacheConfig - not supported yet
 * @param  {object} observer
 */
PrimusRelayClient.prototype.subscribe = function (operation, variables, cacheConfig, observer) {
  var self = this
  var retryOpts = put(this.opts.retry, {
    onError: function (_err, isFinal, count) {
      // create and log error
      self._createErr('subscribe(): Error', count, { errors: [_err], retryable: !isFinal }, {
        operation,
        variables
      })
    }
  })

  // subscribe with retries and return rx-subscription (disposable)
  return this.primus.graphql(operation.text, variables)
    .publish()
    .refCount()
    .backoff(retryOpts)
    .subscribe(
      function (data) { return observer.onNext({ data }) },
      observer.onError,
      observer.onCompleted
    )
}

PrimusRelayClient.prototype._createErr = function (reason, count, source, query) {
  var retryable = exists(source.retryable)
    ? source.retryable
    : (!source.statusCode || source.statusCode >= 500)
  var message = [
    reason + ',',
    'tried ' + count + ' times.',
    (retryable && count < this.opts.retry.retries + 1) ? ' Retrying...' : ''
  ].join(' ')
  // log errors as warnings
  warning(false, message)
  if (source.errors) {
    source.errors.forEach(function (err) {
      warning(false, errWarnMessage(err))
    })
  }
  // create error
  var err = new Error(message)
  // payload or timeout
  err.source = source
  // debug
  err.count = count
  err.query = query
  return err
}
