var EventEmitter = require('events').EventEmitter

var expect = require('code').expect
var noop = require('101/noop')
var pluck = require('101/pluck')
var put = require('101/put')
var sinon = require('sinon')

var describe = global.describe
var it = global.it
var afterEach = global.afterEach
var beforeEach = global.beforeEach

var defaultOpts = require('../src/default-opts.js')
var SubscriptionObservable = require('../src/client/subscription-observable.js')
var id = 0

describe('subscription-observable', function () {
  beforeEach(function () {
    var self = this
    // mocks
    this.resEE = new EventEmitter()
    this.uuid = id++
    this.primus = (function mockPrimus () {
      var p = new EventEmitter()
      sinon.spy(p, 'on')
      sinon.spy(p, 'removeListener')
      p.write = sinon.stub()
      return p
    })()
    this.data = {}
    this.payload = {
      id: this.uuid,
      query: 'subscription ...',
      variables: {
        input_0: {}
      },
      operationName: 'subscription'
    }
    this.data[defaultOpts.key] = this.payload
    // helpers
    this.emitEvent = function (event, resPayload) {
      resPayload = Object.assign({
        id: self.payload.id,
        event: event
      }, resPayload || {})
      self.resEE.emit(self.payload.id, resPayload)
    }
    this.emitNext = function (next) {
      self.emitEvent('next', { data: next })
    }
    this.emitErrs = function (errors) {
      self.emitEvent('error', { errors: errors })
    }
    this.emitCompleted = function (errors) {
      self.emitEvent('completed')
    }
  })

  describe('constructor', function () {
    beforeEach(function () {
      sinon.stub(SubscriptionObservable.prototype._onData, 'bind')
      sinon.stub(SubscriptionObservable.prototype._onReconnected, 'bind')
    })
    afterEach(function () {
      SubscriptionObservable.prototype._onData.bind.restore()
      SubscriptionObservable.prototype._onReconnected.bind.restore()
    })

    it('should create an observable', function () {
      var observable = new SubscriptionObservable(this.primus, this.resEE, this.data, defaultOpts)
      expect(observable.subscribe).to.be.a.function()
      var bind = SubscriptionObservable.prototype._onData.bind
      sinon.assert.calledOnce(bind)
      sinon.assert.calledWith(bind, observable)
      var bind2 = SubscriptionObservable.prototype._onReconnected.bind
      sinon.assert.calledOnce(bind2)
      sinon.assert.calledWith(bind2, observable)
    })
  })

  describe('methods', function () {
    beforeEach(function () {
      this.observable = new SubscriptionObservable(this.primus, this.resEE, this.data, defaultOpts)
    })

    describe('subscribe', function () {
      describe('write fail', function () {
        beforeEach(function () {
          this.primus.write.returns(false)
        })

        it('should invoke onError', function () {
          var onError = sinon.stub()
          var disposable = this.observable.subscribe(noop, onError, noop)
          expect(disposable.dispose).to.be.a.function()
          sinon.assert.calledOnce(onError)
          sinon.assert.calledWith(onError, sinon.match(function (err) {
            return /write failed/.test(err.message)
          }))
        })
      })
      describe('write success', function () {
        beforeEach(function () {
          this.primus.write.returns(true)
        })

        it('should attach onNext', function () {
          var callbacks = {
            onNext: sinon.stub(),
            onError: sinon.stub(),
            onCompleted: sinon.stub()
          }
          this.observable.subscribe(
            callbacks.onNext,
            callbacks.onError,
            callbacks.onCompleted
          )
          var next = {}
          this.emitNext({})
          sinon.assert.calledOnce(callbacks.onNext)
          sinon.assert.calledWith(callbacks.onNext, next)
          sinon.assert.notCalled(callbacks.onError)
          sinon.assert.notCalled(callbacks.onCompleted)
        })

        it('should attach onError', function () {
          var callbacks = {
            onNext: sinon.stub(),
            onError: sinon.stub(),
            onCompleted: sinon.stub()
          }
          this.observable.subscribe(
            callbacks.onNext,
            callbacks.onError,
            callbacks.onCompleted
          )
          var err = new Error('boom')
          this.emitErrs([err])
          sinon.assert.calledOnce(callbacks.onError)
          sinon.assert.calledWith(callbacks.onError, err)
          sinon.assert.notCalled(callbacks.onNext)
          sinon.assert.notCalled(callbacks.onCompleted)
        })

        it('should attach onError (parse errs)', function () {
          var callbacks = {
            onNext: sinon.stub(),
            onError: sinon.stub(),
            onCompleted: sinon.stub()
          }
          this.observable.subscribe(
            callbacks.onNext,
            callbacks.onError,
            callbacks.onCompleted
          )
          var err = new Error('boom')
          err.errors = [{ message: 'baboom' }, { message: 'bababoom' }]
          this.emitErrs([err])
          sinon.assert.calledOnce(callbacks.onError)
          sinon.assert.calledWith(callbacks.onError, sinon.match(function (_err) {
            expect(_err.message).to.equal('multiple errors')
            expect(_err).to.be.an.instanceOf(Error)
            expect(_err.errors[0]).to.be.an.instanceOf(Error)
            expect(_err.errors[1]).to.be.an.instanceOf(Error)
            expect(_err.errors[0].message).to.equal('baboom')
            expect(_err.errors[1].message).to.equal('bababoom')
            return true
          }))
          sinon.assert.notCalled(callbacks.onNext)
          sinon.assert.notCalled(callbacks.onCompleted)
        })

        it('should attach onCompleted', function () {
          var callbacks = {
            onNext: sinon.stub(),
            onError: sinon.stub(),
            onCompleted: sinon.stub()
          }
          this.observable.subscribe(
            callbacks.onNext,
            callbacks.onError,
            callbacks.onCompleted
          )
          this.emitCompleted()
          sinon.assert.calledOnce(callbacks.onCompleted)
          sinon.assert.notCalled(callbacks.onNext)
          sinon.assert.notCalled(callbacks.onError)
        })

        it('should attach onReconnected', function () {
          var callbacks = {
            onNext: sinon.stub(),
            onError: sinon.stub(),
            onCompleted: sinon.stub()
          }
          this.observable.subscribe(
            callbacks.onNext,
            callbacks.onError,
            callbacks.onCompleted
          )
          sinon.assert.calledOnce(this.primus.write)
          sinon.assert.calledWith(this.primus.write, this.data)
          this.primus.emit('reconnected')
          var expectedData = {}
          expectedData[defaultOpts.key] = put(this.payload, 'variables.input_0.reconnect', true)
          sinon.assert.calledTwice(this.primus.write)
          sinon.assert.calledWith(this.primus.write, expectedData)
        })
      })
    })

    describe('subscription.dispose', function () {
      beforeEach(function () {
        this.primus.write.returns(true)
      })

      it('should detach event handlers', function () {
        var callbacks = {
          onNext: sinon.stub(),
          onError: sinon.stub(),
          onCompleted: sinon.stub()
        }
        var subscription = this.observable.subscribe(
          callbacks.onNext,
          callbacks.onError,
          callbacks.onCompleted
        )
        expect(subscription.unsubscribe).to.be.a.function()
        subscription.unsubscribe()
        // mock next event to ensure only disposable2's callbacks are fired
        var next = {}
        this.emitNext(next)
        // assert not fired
        sinon.assert.notCalled(callbacks.onNext)
        sinon.assert.notCalled(callbacks.onError)
        sinon.assert.notCalled(callbacks.onCompleted)
        // expect calls
        var eventArgs = this.primus.write.args.filter(pluck('[0].' + defaultOpts.key + '.event'))
        var expectedData = {}
        expectedData[defaultOpts.key] = {
          id: this.payload.id,
          event: 'unsubscribe'
        }
        expect(eventArgs.length).to.equal(1)
        sinon.assert.calledWith(this.primus.write, expectedData)
      })
    })
  })
})
