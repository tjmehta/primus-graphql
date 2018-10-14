var http = require('http')

var createPrimus = require('./create-primus.js')
var shimmer = require('shimmer')

shimmer.wrap(http, 'createServer', function (orig) {
  return function () {
    var server = orig.apply(this, arguments)
    createPrimus(server)
    return server
  }
})
