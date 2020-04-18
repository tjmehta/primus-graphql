module.exports = function allSettled(promises) {
  return Promise.all(promises.map(function (promise) {
    return promise.then(function (val) {
      if (val.status) return val
      return { status: 'fulfilled', value: val }
    }).catch(function (err) {
      return { status: 'rejected', reason: err }
    })
  }))
}
