var EventEmitter = require('events').EventEmitter

var debug = require('debug')('primus-graphql:fixtures:mem-db')
var listenAll = require('listen-all')

var db = module.exports = {}
db.users = [
  {
    id: '0',
    name: 'name0'
  }
]
db.ee = new EventEmitter()
listenAll(db.ee, function () {
  debug('db event', arguments)
})
