require('./karma-primus.js')
var http = require('http')

// NOTE: comment out karma-primus in karmaconf when using this server.
// also change primus's server port to match below

http.createServer().listen(8181, function (err) {
  if (err) throw err
  console.log('listening on 8181')
})
