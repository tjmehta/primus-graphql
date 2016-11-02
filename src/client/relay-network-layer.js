var assert = require('assert')

var defaults = require('101/defaults')
var put = require('101/put')
var retry = require('promise-retry')
var warning = require('warning')

var timeout = function (time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time)
  })
}

var createPayloadError = function (req, type, payload) {
  var message = [
    'Server request for ', type, ' `',
    req.getDebugName(), '` ',
    'failed for the following reasons:\n\n',
    formatRequestErrors(req, payload.errors)
  ].join('')
  var err = new Error(message)
  err.source = payload
  return err
}

module.exports = PrimusRelayNetworkLayer

function PrimusRelayNetworkLayer (primus, opts) {
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
}

/**
 * send graphql mutation
 * @param  {RelayQueryRequest} mutationRequest
 * @return {Promise<,Error>}
 */
PrimusRelayNetworkLayer.prototype.sendMutation = function (mutationRequest) {
  return this.primus.graphql(
    mutationRequest.getQueryString(),
    mutationRequest.getVariables(),
    mutationRequest.getFiles()
  ).then(function (payload) {
    if (payload.hasOwnProperty('errors')) {
      var err = new Error('payload errors')
      err.source = payload
      throw err
    }
    mutationRequest.resolve({ response: payload.data })
  }).catch(function (err) {
    var payload = err.source
    if (payload && payload.hasOwnProperty('errors')) {
      err = createPayloadError(mutationRequest, 'mutation', payload)
    }
    mutationRequest.reject(err)
  })
}

/**
 * send graphql queries
 * @param  {Array<RelayQueryRequest>} queryRequests
 * @return {Promise<,Error>}
 */
PrimusRelayNetworkLayer.prototype.sendQueries = function (queryRequests) {
  var self = this
  return Promise.all(queryRequests.map(function (queryRequest) {
    return self._sendQueryWithRetries(queryRequest)
      .then(function (payload) {
        var err
        var message
        if (payload.hasOwnProperty('errors')) {
          err = new Error('payload errors')
          err.source = payload
          throw err
        }
        if (!payload.hasOwnProperty('data')) {
          message = [
            'Server response was missing for query `',
            queryRequest.getDebugName(), '`.'
          ].join('')
          err = new Error(message)
          err.source = payload
          queryRequest.reject(err)
          return
        }
        queryRequest.resolve({ response: payload.data })
      })
      .catch(function (err) {
        var payload = err.source
        if (payload && payload.hasOwnProperty('errors')) {
          err = createPayloadError(queryRequest, 'query', payload)
        }
        queryRequest.reject(err)
      })
  }))
}

/**
 * send graphql subscription
 * @param  {RelayQueryRequest} subscriptionRequest
 * @return {Promise<,Error>}
 */
PrimusRelayNetworkLayer.prototype.sendSubscription = function (subscriptionRequest) {
  var observable = this.primus.graphql(
    subscriptionRequest.getQueryString(),
    subscriptionRequest.getVariables()
  )
  var onError = subscriptionRequest.onError.bind(subscriptionRequest)
  var onAllErrors = function (_err, isFinal, retryCount) {
    if (!isFinal) {
      warning(false, 'sendSubscription: Error, retrying.')
      warning(false, _err.stack || _err.message)
    }
  }
  var retryOpts = put(this.opts.retry, {
    onError: onAllErrors
  })
  var onFinalError = function onFinalError (_err) {
    var message = [
      'sendSubscription(): Failed to maintain subscription to server,',
      'tried', retryOpts.retries + 1, 'times.'
    ].join(' ')
    warning(false, message)
    warning(false, _err.stack || _err.message)
    var err = new Error(message)
    // payload
    err.source = { errors: [_err] }
    // debug
    err.count = retryOpts.retries + 1
    err.request = subscriptionRequest
    onError(err)
  }

  observable = observable
    .publish()
    .refCount()
    .backoff(retryOpts)
  // subscribe
  return observable.subscribe(
    subscriptionRequest.onNext.bind(subscriptionRequest),
    onFinalError,
    subscriptionRequest.onCompleted.bind(subscriptionRequest)
  )
}

/**
 * supports
 * @return {Boolean} false
 */
PrimusRelayNetworkLayer.prototype.supports = function () {
  return false
}

/**
 * send graphql queries
 * @param  {RelayQueryRequest} queryRequest
 * @return {Promise<,Error>}
 */
PrimusRelayNetworkLayer.prototype._sendQueryWithRetries = function (queryRequest) {
  var opts = this.opts
  var primus = this.primus
  function throwRetryErr (source, count) {
    var message = [
      'sendQueryWithRetries(): Failed to get response from server,',
      'tried', opts.retry.retries + 1, 'times.'
    ].join(' ')
    if (count > opts.retry.retries) {
      warning(false, message)
      if (source.errors) {
        source.errors.forEach(function (err) {
          warning(false, err.stack || err.message)
        })
      }
    }
    var err = new Error(message)
    // payload
    err.source = source
    // debug
    err.count = opts.retry.retries + 1
    err.request = queryRequest
    throw err
  }
  return retry(function (retryCb, count) {
    return Promise.race([
      timeout(opts.timeout).then(throwRetryErr.bind(null, { errors: [new Error('Request timed out')] }, count)),
      primus.graphql(
        queryRequest.getQueryString(),
        queryRequest.getVariables()
      )
    ])
      .then(function (payload) {
        if (payload.statusCode >= 200 && payload.statusCode < 300) {
          return payload
        } else {
          warning(false, 'sendQueryWithRetries: Error statusCode, retrying.')
          throwRetryErr(payload, count)
        }
      })
      .catch(retryCb)
  }, opts.retry)
}

/**
 * Formats an error response from GraphQL server request.
 */
function formatRequestErrors (request, errors) {
  var CONTEXT_BEFORE = 20
  var CONTEXT_LENGTH = 60

  var queryLines = request.getQueryString().split('\n')
  return errors.map(function (_ref, ii) {
    var locations = _ref.locations
    var message = _ref.message

    var prefix = ii + 1 + '. '
    var indent = ' '.repeat(prefix.length)

    // custom errors thrown in graphql-server may not have locations
    var locationMessage = locations ? '\n' + locations.map(function (_ref2) {
      var column = _ref2.column
      var line = _ref2.line

      var queryLine = queryLines[line - 1]
      var offset = Math.min(column - 1, CONTEXT_BEFORE)
      return [queryLine.substr(column - 1 - offset, CONTEXT_LENGTH), ' '.repeat(Math.max(0, offset)) + '^^^'].map(function (messageLine) {
        return indent + messageLine
      }).join('\n')
    }).join('\n') : ''

    return prefix + message + locationMessage
  }).join('\n')
}
