var assert = require('assert')

var defaults = require('101/defaults')
var put = require('101/put')
var retry = require('promise-retry')
var warning = require('warning')
var timeout = require('timeout-then')
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
    const timer = timeout(opts.timeout)
    return Promise.race([
      timer.then(function () {
        var errReason = 'fetch(): Request timed out'
        var source = {
          errors: [new Error('Request timed out')]
        }
        var isFinal = count > opts.retry.retries
        var retryable = !isFinal
        throw self._createErr(errReason, count, source, retryable, {
          operation,
          variables
        })
      }),
      primus.graphql(operation.text, variables).catch(err => {
        timer.clear()
        var errReason = 'fetch(): GraphQL client error'
        var source = { errors: [err] }
        var isFinal = count > opts.retry.retries
        var retryable = !isFinal
        throw self._createErr(errReason, count, source, retryable, {
          operation,
          variables
        })
      }).then((val) => {
        timer.clear()
        return val
      })
    ]).catch(retryCb).then(function (payload) {
      // response payload recieved
      if (payload.statusCode == null || payload.statusCode >= 300 || payload.statusCode < 200) {
        // error
        var isFinal = count > opts.retry.retries
        var retryable = !isFinal && (payload.statusCode == null || payload.statusCode >= 500)
        var errReason = 'fetch(): Received error response from server'
        var err = self._createErr(errReason, count, payload, retryable, {
          operation,
          variables
        })
        if (retryable) {
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
    onError: function (err, isFinal, count) {
      // create and log error
      console.log('SUB', isFinal, count, err.status, self.opts.retry)
      var retryable = !isFinal && (err.status == null || err.status >= 500)
      var source = { errors: [err] }
      self._createErr('subscribe(): Error', count, source, retryable, {
        operation,
        variables
      })

      if (!retryable) {
        // dontRetry
        return true
      }
    }
  })

  // subscribe with retries and return rx-subscription (disposable)
  if (observer) {
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
  return {
    subscribe({next, error, complete, start}) {
      const subscription = self.primus.graphql(operation.text, variables)
        .publish()
        .refCount()
        .backoff(retryOpts)
        .subscribe(
          function (data) { return next({ data }) },
          error,
          complete
        )
      start(subscription)
      return subscription
    }
  }
}

PrimusRelayClient.prototype._createErr = function (reason, count, source, retryable, query) {
  var message = [
    reason + ',',
    'tried ' + count + ' times.',
    (retryable && count < this.opts.retry.retries + 1) ? ' Retrying...' : ''
  ].join(' ')
  // log errors as warnings
  warning(false, message, retryable, query)
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
