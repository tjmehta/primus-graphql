var sinon = require('sinon')
require('sinon-as-promised')

var activeSubscriptions = require('../src/server/active-subscriptions.js')
var Subscription = require('rxjs/Subscription').Subscription

var describe = global.describe
var it = global.it
var beforeEach = global.beforeEach
var afterEach = global.afterEach

describe('active-subscriptions', function () {
  describe('methods', function () {
    beforeEach(function () {
      var self = this
      this.connId = 'cid'
      this.connId2 = 'cid2'
      this.payloadId = 'pid'
      this.payloadId2 = 'pid2'
      // spies
      sinon.spy(activeSubscriptions, 'remove')
      // subscription
      this.subscription = new Subscription()
      this.subscription.add(function () {
        activeSubscriptions.remove(self.connId, self.payloadId, self.subscription)
      })
      sinon.spy(this.subscription, 'unsubscribe')
      // subscription2
      this.subscription2 = new Subscription()
      this.subscription2.add(function () {
        activeSubscriptions.remove(self.connId, self.payloadId2, self.subscription2)
      })
      sinon.spy(this.subscription2, 'unsubscribe')
      // subscription3 (only one on connId2)
      this.subscription3 = new Subscription()
      this.subscription3.add(function () {
        activeSubscriptions.remove(self.connId2, self.payloadId2, self.subscription3)
      })
      sinon.spy(this.subscription3, 'unsubscribe')
    })
    afterEach(function () {
      activeSubscriptions.remove.restore()
    })

    describe('add/remove', function () {
      it('should add and remove a subscription', function () {
        var connId = this.connId
        var payloadId = this.payloadId
        var payloadId2 = this.payloadId2
        var subscription = this.subscription
        var subscription2 = this.subscription2
        // add two
        activeSubscriptions.add(connId, payloadId, subscription)
        activeSubscriptions.add(connId, payloadId2, subscription2)
        // remove first
        activeSubscriptions.remove(connId, payloadId, subscription)
        // should not remove twice..
        activeSubscriptions.remove(connId, payloadId)
        // assertions
        sinon.assert.notCalled(subscription.unsubscribe)
        // remove second
        activeSubscriptions.remove(connId, payloadId2)
        // assertions
        sinon.assert.notCalled(subscription2.unsubscribe)
      })
    })

    describe('add/unsubscribe', function () {
      it('should unsubscribe from the subscription', function () {
        var connId = this.connId
        var payloadId = this.payloadId
        var payloadId2 = this.payloadId2
        var subscription = this.subscription
        var subscription2 = this.subscription2
        // add two
        activeSubscriptions.add(connId, payloadId, subscription)
        activeSubscriptions.add(connId, payloadId2, subscription2)
        // unsubscribe first
        activeSubscriptions.unsubscribe(connId, payloadId)
        // should not unsubscribe twice..
        activeSubscriptions.unsubscribe(connId, payloadId)
        // assertions
        sinon.assert.calledOnce(subscription.unsubscribe)
        sinon.assert.calledOnce(activeSubscriptions.remove)
        sinon.assert.calledWith(activeSubscriptions.remove, connId, payloadId)
        // unsubscribe second
        activeSubscriptions.unsubscribe(connId, payloadId2)
        // assertions
        sinon.assert.calledOnce(subscription2.unsubscribe)
        sinon.assert.calledTwice(activeSubscriptions.remove)
        sinon.assert.calledWith(activeSubscriptions.remove, connId, payloadId2)
      })
    })

    describe('unsubscribeAll', function () {
      it('should remove all', function () {
        var connId = this.connId
        var connId2 = this.connId2
        var payloadId = this.payloadId
        var payloadId2 = this.payloadId2
        var subscription = this.subscription
        var subscription2 = this.subscription2
        var subscription3 = this.subscription3
        // add two
        activeSubscriptions.add(connId, payloadId, subscription)
        activeSubscriptions.add(connId, payloadId2, subscription2)
        activeSubscriptions.add(connId2, payloadId2, subscription3)
        // first
        activeSubscriptions.unsubscribeAll(connId)
        // unsubscribe assertions
        sinon.assert.calledOnce(subscription.unsubscribe)
        sinon.assert.calledOnce(subscription2.unsubscribe)
        sinon.assert.notCalled(subscription3.unsubscribe)
        sinon.assert.calledTwice(activeSubscriptions.remove)
        sinon.assert.calledWith(activeSubscriptions.remove, connId, payloadId)
        sinon.assert.calledWith(activeSubscriptions.remove, connId, payloadId2)
        // twice
        activeSubscriptions.unsubscribeAll(connId)
        // unsubscribe assertions (nothing should change)
        sinon.assert.calledOnce(subscription.unsubscribe)
        sinon.assert.calledOnce(subscription2.unsubscribe)
        sinon.assert.notCalled(subscription3.unsubscribe)
        sinon.assert.calledTwice(activeSubscriptions.remove)
        sinon.assert.calledWith(activeSubscriptions.remove, connId, payloadId)
        sinon.assert.calledWith(activeSubscriptions.remove, connId, payloadId2)
      })
    })
  })
})
