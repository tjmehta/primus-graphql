var http = require('http')
var path = require('path')

var createPrimus = require('../test-browser/fixtures/create-primus.js')
var clientPath = path.resolve(__dirname, '../test-browser/fixtures/primus-client.js')

var primus = createPrimus(http.createServer(), {})
clearInterval(primus.pingInterval)
primus.save(clientPath)
console.log('Created ' + path.relative(process.cwd(), clientPath))
