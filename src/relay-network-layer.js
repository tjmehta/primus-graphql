var assert = require('assert')

var defaults = require('101/defaults')
var retry = require('promise-retry')
var warning = require('warning')

var timeout = function (time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time)
  })
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
    var err
    var message
    if (payload.hasOwnProperty('errors')) {
      message = [
        'Server request for mutation `',
        mutationRequest.getDebugName(), '` ',
        'failed for the following reasons:\n\n',
        formatRequestErrors(mutationRequest, payload.errors)
      ].join('')
      err = new Error(message)
      err.source = payload
      mutationRequest.reject(err)
      return
    }
    mutationRequest.resolve({ response: payload.data })
  }).catch(function (err) {
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
          message = [
            'Server request for query `',
            queryRequest.getDebugName(),
            '` failed for the following reasons:\n\n',
            formatRequestErrors(queryRequest, payload.errors)
          ].join('')
          err = new Error(message)
          err.source = payload
          queryRequest.reject(err)
          return
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
        queryRequest.reject(err)
      })
  }))
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
  function throwRetryErr (source) {
    var message = [
      'sendQueryWithRetries(): Failed to get response from server,',
      'tried', opts.retry.retries, 'times.'
    ].join(' ')
    var err = new Error(message)
    err.source = source
    throw err
  }
  return retry(function (retry, number) {
    return Promise.race([
      timeout(opts.timeout).then(throwRetryErr.bind(null, { TIMEDOUT: true })),
      primus.graphql(
        queryRequest.getQueryString(),
        queryRequest.getVariables()
      )
    ])
      .then(function (payload) {
        if (payload.statusCode >= 200 && payload.statusCode < 300) {
          return payload
        } else {
          warning(false, 'fetchWithRetries: Error statusCode, retrying.')
          throwRetryErr(payload)
        }
      })
      .catch(retry)
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
