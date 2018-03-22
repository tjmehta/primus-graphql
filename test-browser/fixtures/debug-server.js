var http = require('http')

var createPrimus = require('../../oldddd/fixtures/create-primus.js')
var shimmer = require('shimmer')

shimmer.wrap(http, 'createServer', function (orig) {
  return function () {
    var server = orig.apply(this, arguments)
    createPrimus(server)
    return server
  }
})

http.createServer().listen(8181, function (err) {
  if (err) throw err
  console.log('listening on 8181')
})
