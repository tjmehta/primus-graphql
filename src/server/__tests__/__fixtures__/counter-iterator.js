var $$asyncIterator = require('iterall').$$asyncIterator

function Counter (to) {
  this.to = to
  this.num = 0
}

Counter.prototype.next = function () {
  if (this.num >= this.to) {
    return this.return()
  }
  return { value: this.num++, done: false }
}

Counter.prototype.return = function () {
  this.num = this.to
  return { value: undefined, done: true }
}

Counter.prototype[$$asyncIterator] = function () {
  return this
}

module.exports = Counter
