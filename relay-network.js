var Relay = require('relay-runtime')
var PrimusRelayClient = require('./lib/client/relay-client')

module.exports = PrimusRelayNetwork

function PrimusRelayNetwork (primus, opts) {
  var primusRelayClient = new PrimusRelayClient(primus, opts)
  return Relay.Network.create(
    primusRelayClient.fetch,
    primusRelayClient.subscribe
  )
}
