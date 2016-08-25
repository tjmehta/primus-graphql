var sinon = require('sinon')
require('sinon-as-promised')

var SubscribeCallbacks = require('../src/server/subscribe-callbacks')

var describe = global.describe
var it = global.it
var beforeEach = global.beforeEach
var afterEach = global.afterEach

describe('subscribe-callbacks', function () {
  describe('constructor', function () {
    beforeEach(function () {
      var proto = SubscribeCallbacks.prototype
      sinon.stub(proto.onCompleted, 'bind').returns(proto.onCompleted)
      sinon.stub(proto.onError, 'bind').returns(proto.onError)
      sinon.stub(proto.onNext, 'bind').returns(proto.onNext)
    })
    afterEach(function () {
      var proto = SubscribeCallbacks.prototype
      proto.onCompleted.bind.restore()
      proto.onError.bind.restore()
      proto.onNext.bind.restore()
    })

    it('should bind handler methods', function () {
      var subscribeCallbacks = new SubscribeCallbacks({}, {}, {})
      sinon.assert.calledOnce(subscribeCallbacks.onCompleted.bind)
      sinon.assert.calledOnce(subscribeCallbacks.onError.bind)
      sinon.assert.calledOnce(subscribeCallbacks.onNext.bind)
      sinon.assert.calledWith(subscribeCallbacks.onCompleted.bind, subscribeCallbacks)
      sinon.assert.calledWith(subscribeCallbacks.onError.bind, subscribeCallbacks)
      sinon.assert.calledWith(subscribeCallbacks.onNext.bind, subscribeCallbacks)
    })
  })

  describe('methods', function () {
    beforeEach(function () {
      this.payload = {
        id: 'id'
      }
      this.mocks = {
        queryExecutor: {
          execute: sinon.stub()
        },
        responder: {
          sendEvent: sinon.stub()
        }
      }
      this.subscribeCallbacks = new SubscribeCallbacks(
        this.payload, this.mocks.queryExecutor, this.mocks.responder)
    })

    describe('onCompleted', function () {
      it('should send an completed-event', function () {
        this.subscribeCallbacks.onCompleted()
        // assertions
        var responder = this.mocks.responder
        sinon.assert.calledOnce(responder.sendEvent)
        sinon.assert.calledWith(responder.sendEvent, this.payload.id, 'completed')
      })
    })

    describe('onError', function () {
      it('should send an error-event', function () {
        var err = new Error('boom')
        this.subscribeCallbacks.onError(err)
        // assertions
        var responder = this.mocks.responder
        sinon.assert.calledOnce(responder.sendEvent)
        sinon.assert.calledWith(responder.sendEvent, this.payload.id, 'error', err)
      })
    })

    describe('onNext', function () {
      it('should send an next-event', function () {
        var next = {}
        this.subscribeCallbacks.onNext(next)
        // assertions
        var responder = this.mocks.responder
        sinon.assert.calledOnce(responder.sendEvent)
        sinon.assert.calledWith(responder.sendEvent, this.payload.id, 'next', next)
      })
    })
  })
})
