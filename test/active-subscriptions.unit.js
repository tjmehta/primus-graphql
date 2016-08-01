var duplexify = require('duplexify')
var expect = require('chai').expect
var proxyquire = require('proxyquire')
var sinon = require('sinon')
var through2 = require('through2')
require('sinon-as-promised')

var activeSubscriptions = require('../src/server/active-subscriptions.js')

var describe = global.describe
var it = global.it
var beforeEach = global.beforeEach
var afterEach = global.afterEach

describe('active-subscriptions', function () {
  describe('methods', function () {
    describe('add/remove', function () {
      it('should add and remove a subscription', function () {
        var connId = 'cid'
        var payloadId = 'pid'
        var subscription = {
          unsubscribe: sinon.stub()
        }
        activeSubscriptions.add(connId, payloadId, subscription)
        // first
        activeSubscriptions.remove(connId, payloadId, subscription)
        // should not remove twice..
        activeSubscriptions.remove(connId, payloadId, subscription)
        // assertions
        sinon.assert.calledOnce(subscription.unsubscribe)
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
    });
  })
})