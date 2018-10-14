var debug = require('debug')('primus-graphql:fixtures:user-changes-iterator')

var iterall = require('iterall')
var db = require('./mem-db.js') // In memory database

var $$asyncIterator = iterall.$$asyncIterator
var i = 0

function createExposedPromise () {
  var _resolve, _reject
  var promise = new Promise(function (resolve, reject) {
    _resolve = resolve
    _reject = reject
  })
  promise.id = ++i
  promise.resolve = function (data) {
    _resolve(data)
    promise.val = data
    return promise
  }
  promise.reject = function (err) {
    _reject(err)
    promise.val = err
    return promise
  }
  return promise
}

module.exports = UserIterator

// following iterator api in https://github.com/graphql/graphql-js/tree/master/src/subscription tests
function UserIterator (userId) {
  this._userId = userId
  // iterator state
  this._nextPromise = null
  this._pullQueue = []
  this._pushQueue = []

  // bind event handlers
  this._handleNext = this._handleNext.bind(this)
  this._handleError = this._handleError.bind(this)
  this._handleComplete = this._handleComplete.bind(this)
  // event state
  this._listening = false
  this._startListening()
  // bind public iterator methods
  this.next = this.next.bind(this)
  this.return = this.return.bind(this)
}

UserIterator.prototype[$$asyncIterator] = function () {
  return this
}

UserIterator.prototype._debug = function () {
  debug('pull %o', this._pullQueue.map(p => '[promise]'))
  debug('push %o', this._pushQueue.map(p => p.val))
}

UserIterator.prototype._handleNext = function (user) {
  debug('_handleNext', user)
  var data = {
    value: {user: user},
    done: false
  }
  var pullPromise = this._pullQueue.pop()
  if (pullPromise) {
    debug('next!', data)
    pullPromise.resolve(data)
    return
  }
  var pushPromise = Promise.resolve(data)
  pushPromise.val = data
  this._pushQueue.unshift(pushPromise)
  this._debug()
}

UserIterator.prototype._handleError = function (err) {
  debug('_handleError', err)
  this._stopListening()
  var pullPromise = this._pullQueue.pop()
  if (pullPromise) {
    debug('next!', err)
    pullPromise.reject(err)
    return
  }
  this._pushQueue.unshift(Promise.reject(err))
  this._debug()
}

UserIterator.prototype._handleComplete = function () {
  debug('_handleComplete')
  this._stopListening()
  var data = {
    value: null,
    done: true
  }
  var pullPromise = this._pullQueue.pop()
  if (pullPromise) {
    debug('next!', data)
    pullPromise.resolve(data)
    return
  }
  this._pushComplete()
}

UserIterator.prototype._pushComplete = function () {
  var data = {
    value: null,
    done: true
  }
  var pushPromise = Promise.resolve(data)
  pushPromise.val = data
  this._pushQueue.unshift(pushPromise)
  this._debug()
}

UserIterator.prototype._startListening = function () {
  if (this._listening) return
  debug('start listening')
  this._listening = true
  var eventNamespace = 'users:' + this._userId
  db.ee.on(eventNamespace, this._handleNext)
  db.ee.once(eventNamespace + ':error', this._handleError)
  db.ee.once(eventNamespace + ':completed', this._handleComplete)
  // trigger current data
  db.updateUser(this._userId, {})
}

UserIterator.prototype._stopListening = function () {
  debug('stop listening')
  if (!this._listening) return
  this._listening = false
  var eventNamespace = 'users:' + this._userId
  db.ee.removeAllListeners(eventNamespace)
  db.ee.removeAllListeners(eventNamespace + ':error')
  db.ee.removeAllListeners(eventNamespace + ':completed')
}

UserIterator.prototype.next = function () {
  var pushPromise = this._pushQueue.pop()
  if (pushPromise) {
    debug('next!', pushPromise.val)
    return pushPromise
  }
  var pullPromise = createExposedPromise()
  this._pullQueue.unshift(pullPromise)
  this._debug()
  return pullPromise
}

UserIterator.prototype.return = function () {
  debug('return')
  this._stopListening()
  this._pushComplete()
  return Promise.resolve({ value: undefined, done: true })
}
