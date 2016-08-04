var debug = require('debug')('primus-graphql:test:create-primus')
var equals = require('101/equals')
var findIndex = require('101/find-index')
var Primus = require('primus')

var schema = require('./graphql-schema.js')

module.exports = createPrimus

function createPrimus (server, pluginOpts) {
  var primus = new Primus(server, {
    transport: 'engine.io',
    parser: 'json',
    graphql: {}
  })

  primus.__sparks = []

  primus.use('graphql', require('../../index.js')({
    schema: schema
  }))

  primus.on('connection', function (spark) {
    debug('spark connected %o', spark.id)
    primus.__sparks.push(spark)
  })

  primus.on('disconnection', function (spark) {
    debug('spark disconnected %o', spark.id)
    var index = findIndex(primus.__sparks, equals(spark))
    if (~index) {
      primus.__sparks.splice(index, 1)
      debug('num sparks connected %o', primus.__sparks.length)
    }
  })

  return primus
}
