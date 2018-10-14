var Relay = require('relay-runtime')
var PrimusRelayNetwork = require('../../../relay-network') // module

var network = null

module.exports = function getRelayNetwork (primus) {
  if (network) return network
  network = new PrimusRelayNetwork(primus)
  return network
}
