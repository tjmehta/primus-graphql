var sinon = require('sinon')
require('sinon-as-promised')

var activeSubscriptions = require('../src/server/active-subscriptions.js')

var describe = global.describe
var it = global.it

describe('active-subscriptions', function () {
  describe('methods', function () {
    describe('add/remove', function () {
      it('should add and remove a subscription', function () {
        var connId = 'cid'
        var payloadId = 'pid'
        var payloadId2 = 'pid2'
        var subscription = {
          unsubscribe: sinon.stub()
        }
        var subscription2 = {
          unsubscribe: sinon.stub()
        }
        // add two
        activeSubscriptions.add(connId, payloadId, subscription)
        activeSubscriptions.add(connId, payloadId2, subscription2)
        // remove first
        activeSubscriptions.remove(connId, payloadId, subscription)
        // should not remove twice..
        activeSubscriptions.remove(connId, payloadId)
        // assertions
        sinon.assert.calledOnce(subscription.unsubscribe)
        // remove second
        activeSubscriptions.remove(connId, payloadId2)
        // assertions
        sinon.assert.calledOnce(subscription2.unsubscribe)
      })
    })

    describe('removeAll', function () {
      it('should remove all', function () {
        var connId = 'cid'
        var payloadId = 'pid'
        var subscription = {
          unsubscribe: sinon.stub()
        }
        activeSubscriptions.add(connId, payloadId, subscription)
        // first
        activeSubscriptions.removeAll(connId)
        sinon.assert.calledOnce(subscription.unsubscribe)
        // should not remove twice..
        activeSubscriptions.remove(connId, payloadId, subscription)
        sinon.assert.calledOnce(subscription.unsubscribe)
      })
    })
  })
})
