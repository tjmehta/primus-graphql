var expect = require('code').expect
var proxyquire = require('proxyquire')
var sinon = require('sinon')

describe('subscription-dispose', function () {
  it('should add dispose', function () {
    var Subscription = function () {}
    Subscription.prototype = {
      unsubscribe: sinon.stub()
    }
    proxyquire('../src/shared/subscription-dispose.js', {
      'rxjs/Subscription': { Subscription: Subscription }
    })
    expect(Subscription.prototype.dispose).to.be.a.function()
    var subscription = new Subscription()
    subscription.dispose()
    sinon.assert.calledOnce(subscription.unsubscribe)
  })
})