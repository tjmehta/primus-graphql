var http = require('http')
var path = require('path')

var createPrimus = require('../__browser_tests__/fixtures/create-primus.js')
var clientPath = path.resolve(__dirname, '../__browser_tests__/fixtures/primus-client.js')

var primus = createPrimus(http.createServer(), {})
clearInterval(primus.pingInterval)
primus.save(clientPath)
console.log('Created ' + path.relative(process.cwd(), clientPath))
