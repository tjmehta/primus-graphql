require('./karma-primus.js')

require('http').createServer().listen(8181, function (err) {
  if (err) throw err
  console.log('listening on 8181')
})
