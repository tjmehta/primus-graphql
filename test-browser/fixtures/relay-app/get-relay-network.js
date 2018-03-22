var Relay = require('relay-runtime')
var PrimusRelayClient = require('../../../relay-client') // module

var network = null

module.exports = function getRelayNetwork (primus) {
  if (network) return network
  var primusRelayClient = new PrimusRelayClient(primus)
  network = Relay.Network.create(
    primusRelayClient.fetch,
    primusRelayClient.subscribe
  )
  return network
}
