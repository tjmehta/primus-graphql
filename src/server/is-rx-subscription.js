var exists = require('101/exists')
var isFunction = require('101/is-function')

module.exports = isRxSubscription

/**
 * is a rx subscription or disposable
 * @param  {*}  val  value to test
 * @return {Boolean} bool  is subscription or disposable
 */
function isRxSubscription (val) {
  return exists(val) && isFunction(val.unsubscribe)
}
