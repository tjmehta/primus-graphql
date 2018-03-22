var $$asyncIterator = require('iterall').$$asyncIterator
var bindAll = require('101/bind-all')
var ExposedPromise = require('exposed-promise')

function EventIterator (ee) {
  this.ee = ee
  bindAll(['_handleNext', '_handleComplete', '_handleError'])
  ee.on('next', this._handleNext)
  ee.on('complete', this._handleComplete)
  ee.on('error', this._handleError)
  this._listening = true
  this._pullQueue = []
  this._pushQueue = []
}

EventIterator.prototype._handleNext = function (value) {
  const result = {value: value, done: false}
  if (this._pullQueue.length) {
    this._pullQueue.pop().resolve(result)
    return
  }
  this._pushQueue.push(Promise.resolve(result))
}
EventIterator.prototype._handleComplete = function () {
  const result = {value: undefined, done: true}
  if (this._pullQueue.length) {
    this._pullQueue.pop().resolve(result)
    return
  }
  this._pushQueue.push(Promise.resolve(result))
}
EventIterator.prototype._handleError = function (err) {
  if (this._pullQueue.length) {
    this._pullQueue.pop().reject(err)
    return
  }
  this._pushQueue.push(Promise.reject(err))
}

EventIterator.prototype.next = function () {
  if (!this._listening) return this.return()
  if (this._pushQueue.length) {
    return this._pushQueue.pop()
  }
  this.pullQueue.push(new ExposedPromise())
}

EventIterator.prototype.return = function () {
  this.ee.removeListener('next', this._handleNext)
  this.ee.removeListener('complete', this._handleComplete)
  this.ee.removeListener('error', this._handleError)
  this._handleComplete() // ???
}

EventIterator.prototype[$$asyncIterator] = function () {
  return this
}

module.exports = EventIterator
