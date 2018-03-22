var RelayRuntime = require('relay-runtime')
var getNetwork = require('./get-relay-network')

function handlerProvider (handle) {
  switch (handle) {
    // Augment (or remove from) this list:
    case 'connection': return RelayRuntime.ConnectionHandler
    case 'viewer': return RelayRuntime.ViewerHandler
  }
  throw new Error(
    `handlerProvider: No handler provided for ${handle}`
  )
}

var environment = null
var _primus = null

module.exports = function getEnvironment (primus) {
  if (environment) return environment
  _primus = primus
  environment = newEnvironment(primus)
  return environment
}

module.exports.newEnvironment = newEnvironment

function newEnvironment () {
  var source = new RelayRuntime.RecordSource()
  var store = new RelayRuntime.Store(source)
  environment = new RelayRuntime.Environment({
    handlerProvider: handlerProvider,
    network: getNetwork(_primus),
    store: store
  })
  return environment
}