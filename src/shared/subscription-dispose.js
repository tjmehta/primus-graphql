var Subscription = require('rxjs/Subscription').Subscription

/**
 * alias for unsubscribe for disposable signature..
 */
Subscription.prototype.dispose = function () {
  // added by primus-graphql
  return this.unsubscribe()
}
