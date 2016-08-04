var http = require('http')
var path = require('path')

var createPrimus = require('../test/fixtures/create-primus.js')
var clientPath = path.resolve(__dirname, '../test-browser/fixtures/primus-client.js')

var primus = createPrimus(http.createServer(), {})
primus.save(clientPath)
