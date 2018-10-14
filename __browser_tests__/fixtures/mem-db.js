var EventEmitter = require('events').EventEmitter

var debug = require('debug')('primus-graphql:fixtures:mem-db')
var listenAll = require('listen-all')

var nextUserId = 0

var db = module.exports = {}
db.users = []
db.ee = new EventEmitter()
listenAll(db.ee, function () {
  debug('db event', arguments)
})

db.createUser = function (data) {
  var user = Object.assign({}, data, { id: nextUserId })
  db.users.push(user)
  nextUserId++
  return user
}

db.getUser = function (userId) {
  return db.users.find((u) => u.id.toString() === userId.toString())
}

db.updateUser = function (userId, data) {
  var user = db.getUser(userId)
  if (user) {
    var index = db.users.findIndex((u) => u.id.toString() === userId.toString())
    user = db.users[index] = Object.assign({}, user, data)
    db.ee.emit('users:' + user.id, Object.assign({}, user))
    return user
  }
}

db.reset = function () {
  db.users = []
}
