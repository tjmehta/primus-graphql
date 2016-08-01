var duplexify = require('duplexify')
var expect = require('chai').expect
var proxyquire = require('proxyquire')
var sinon = require('sinon')
var through2 = require('through2')
require('sinon-as-promised')

var describe = global.describe
var it = global.it
var beforeEach = global.beforeEach
var afterEach = global.afterEach

describe('data-handler', function () {
  beforeEach(function () {
    this.promise = sinon.stub()
    // mocks
    this.mocks = {
      activeSubscriptions: {
        add: sinon.stub(),
        remove: sinon.stub(),
        removeAll: sinon.stub()
      },
      queryExecutor: {
        execute: sinon.stub(),
        observe: sinon.stub()
      },
      responder: {
        send: sinon.stub(),
        sendErrs: sinon.stub(),
        sendEvent: sinon.stub()
      },
      subscribeCallbacks: {
        onNext: sinon.stub(),
        onError: sinon.stub(),
        onCompleted: sinon.stub()
      }
    }
    this.mocks.QueryExecutor = sinon.stub().returns(this.mocks.queryExecutor)
    this.mocks.Responder = sinon.stub().returns(this.mocks.responder)
    this.mocks.SubscribeCallbacks = sinon.stub().returns(this.mocks.subscribeCallbacks)
    // proxyquire
    this.DataHandler = proxyquire('../src/server/data-handler.js', {
      './active-subscriptions.js': this.mocks.activeSubscriptions,
      './query-executor.js': this.mocks.QueryExecutor,
      './responder.js': this.mocks.Responder,
      './subscribe-callbacks.js': this.mocks.SubscribeCallbacks
    })
    var toServer = through2.obj()
    var toClient = through2.obj()
    this.primusClient = duplexify.obj(toServer, toClient)
    this.spark = duplexify.obj(toClient, toServer)
    this.spark.id = 'sparkId'
  })

  describe('constructor', function () {
    beforeEach(function () {
      this.bound = {}
      sinon.stub(this.DataHandler.prototype.handleData, 'bind').returns(this.bound)
      sinon.stub(this.DataHandler.prototype.handleClose, 'bind').returns(this.bound)
    })
    afterEach(function () {
      this.DataHandler.prototype.handleData.bind.restore()
      this.DataHandler.prototype.handleClose.bind.restore()
    })

    it('should bind handlers and create models', function () {
      var DataHandler = this.DataHandler
      var dataHandler = new DataHandler({}, {}, {})
      var bind = DataHandler.prototype.handleData.bind
      var bind2 = DataHandler.prototype.handleClose.bind
      // TODO: models constructor assertions
      sinon.assert.calledOnce(bind)
      sinon.assert.calledWith(bind, dataHandler)
      sinon.assert.calledOnce(bind2)
      sinon.assert.calledWith(bind2, dataHandler)
      expect(dataHandler.handleData).to.equal(this.bound)
      expect(dataHandler.handleClose).to.equal(this.bound)
    })
  })

  describe('methods', function () {
    beforeEach(function () {
      this.spark = { id: 'sparkId' }
      this.opts = {}
      this.primusOpts = { key: 'key' }
      this.dataHandler = new this.DataHandler(this.spark, this.opts, this.primusOpts)
    })

    describe('handleClose', function () {
      it('should remove all connection\'s subscriptions', function () {
        this.dataHandler.handleClose()
        // assertions
        var activeSubscriptions = this.mocks.activeSubscriptions
        sinon.assert.calledOnce(activeSubscriptions.removeAll)
        sinon.assert.calledWith(activeSubscriptions.removeAll, this.spark.id)
      })
    })

    describe('handleData', function () {
      beforeEach(function () {
        sinon.stub(this.dataHandler, '_handleEvent')
        sinon.stub(this.dataHandler, '_handleQueryOrMutation')
        sinon.stub(this.dataHandler, '_handleSubscription')
      })

      it('should do nothing if no payload', function () {
        var dataHandler = this.dataHandler
        var queryExecutor = this.mocks.queryExecutor
        var responder = this.mocks.responder
        // call handle
        var data = {}
        dataHandler.handleData(data)
        // assertions
        sinon.assert.notCalled(dataHandler._handleEvent)
        sinon.assert.notCalled(dataHandler._handleQueryOrMutation)
        sinon.assert.notCalled(dataHandler._handleSubscription)
        sinon.assert.notCalled(queryExecutor.execute)
        sinon.assert.notCalled(responder.send)
        sinon.assert.notCalled(responder.sendErrs)
        sinon.assert.notCalled(responder.sendEvent)
      })

      it('should do nothing if no payload.id', function () {
        var dataHandler = this.dataHandler
        var queryExecutor = this.mocks.queryExecutor
        var responder = this.mocks.responder
        // call handle
        var data = {}
        data[this.primusOpts.key] = {}
        dataHandler.handleData(data)
        // assertions
        sinon.assert.notCalled(dataHandler._handleEvent)
        sinon.assert.notCalled(dataHandler._handleQueryOrMutation)
        sinon.assert.notCalled(dataHandler._handleSubscription)
        sinon.assert.notCalled(queryExecutor.execute)
        sinon.assert.notCalled(responder.send)
        sinon.assert.notCalled(responder.sendErrs)
        sinon.assert.notCalled(responder.sendEvent)
      })

      it('should handle as event if payload.event exists', function () {
        var dataHandler = this.dataHandler
        // call handle
        var data = {}
        var payload = {
          id: 'id',
          event: 'event'
        }
        data[this.primusOpts.key] = payload
        dataHandler.handleData(data)
        // assertions
        sinon.assert.calledOnce(dataHandler._handleEvent)
        sinon.assert.calledWith(dataHandler._handleEvent, payload)
      })

      it('should handle as subscription if payload.query is a subscription', function () {
        var dataHandler = this.dataHandler
        // call handle
        var data = {}
        var payload = {
          id: 'id',
          query: 'subscription'
        }
        data[this.primusOpts.key] = payload
        dataHandler.handleData(data)
        // assertions
        sinon.assert.calledOnce(dataHandler._handleSubscription)
        sinon.assert.calledWith(dataHandler._handleSubscription, payload)
      })

      it('should handle as query/mutation if payload.query is a query', function () {
        var dataHandler = this.dataHandler
        // call handle
        var data = {}
        var payload = {
          id: 'id',
          query: 'query'
        }
        data[this.primusOpts.key] = payload
        dataHandler.handleData(data)
        // assertions
        sinon.assert.calledOnce(dataHandler._handleQueryOrMutation)
        sinon.assert.calledWith(dataHandler._handleQueryOrMutation, payload)
      })

      it('should handle as query/mutation if payload.query is a mutation', function () {
        var dataHandler = this.dataHandler
        // call handle
        var data = {}
        var payload = {
          id: 'id',
          query: 'mutation'
        }
        data[this.primusOpts.key] = payload
        dataHandler.handleData(data)
        // assertions
        sinon.assert.calledOnce(dataHandler._handleQueryOrMutation)
        sinon.assert.calledWith(dataHandler._handleQueryOrMutation, payload)
      })

      it('should error if payload is invalid', function () {
        var dataHandler = this.dataHandler
        var responder = this.mocks.responder
        // call handle
        var data = {}
        var payload = { id: 'id' }
        data[this.primusOpts.key] = payload
        dataHandler.handleData(data)
        // assertions
        sinon.assert.calledOnce(responder.sendErrs)
        sinon.assert.calledWith(responder.sendErrs, payload.id, 400, sinon.match(function (errs) {
          expect(errs.length).to.equal(1)
          expect(errs[0].message).to.equal('payload.query or payload.event is required')
          return true
        }))
      })

      it('should error if query is invalid', function () {
        var dataHandler = this.dataHandler
        var responder = this.mocks.responder
        // call handle
        var data = {}
        var payload = { id: 'id', query: {} }
        data[this.primusOpts.key] = payload
        dataHandler.handleData(data)
        // assertions
        sinon.assert.calledOnce(responder.sendErrs)
        sinon.assert.calledWith(responder.sendErrs, payload.id, 400, sinon.match(function (errs) {
          expect(errs.length).to.equal(1)
          expect(errs[0].message).to.equal('payload.query must be a string')
          return true
        }))
      })
    })

    describe('_handleEvent', function () {
      it('should handle unsubscribe event', function () {
        var payload = {
          id: 'id',
          event: 'unsubscribe'
        }
        this.dataHandler._handleEvent(payload)
        var activeSubscriptions = this.mocks.activeSubscriptions
        sinon.assert.calledOnce(activeSubscriptions.remove)
        sinon.assert.calledWith(activeSubscriptions.remove, this.spark.id, payload.id)
      })

      it('should do nothing for unknown events', function () {
        var payload = {
          id: 'id',
          event: '_bogus_'
        }
        this.dataHandler._handleEvent(payload)
        var activeSubscriptions = this.mocks.activeSubscriptions
        sinon.assert.notCalled(activeSubscriptions.remove)
      })
    })

    describe('_handleQueryOrMutation', function () {
      it('should respond w/ graphql result if successful', function () {
        var self = this
        var result = {}
        this.mocks.queryExecutor.execute.resolves(result)
        var payload = { id: 'id' }
        return this.dataHandler._handleQueryOrMutation(payload).then(function () {
          var responder = self.mocks.responder
          sinon.assert.calledOnce(responder.send)
          sinon.assert.calledWith(responder.send, payload.id, 200, result)
        })
      })

      it('should respond w/ graphql error if it errors', function () {
        var self = this
        var err = {
          statusCode: 401
        }
        this.mocks.queryExecutor.execute.rejects(err)
        var payload = { id: 'id' }
        return this.dataHandler._handleQueryOrMutation(payload).then(function () {
          var responder = self.mocks.responder
          sinon.assert.calledOnce(responder.sendErrs)
          sinon.assert.calledWith(responder.sendErrs, payload.id, err.statusCode, [err])
        })
      })
    })

    describe('_handleSubscription', function () {
      beforeEach(function () {
        this.mocks.subscription = {
          unsubscribe: sinon.stub()
        }
        this.mocks.observable = {
          subscribe: sinon.stub().returns(this.mocks.subscription)
        }
        this.mocks.queryExecutor.observe.returns(this.mocks.observable)
      })

      it('should observe, subscribe, and save subscription', function () {
        var payload = { id: 'id' }
        var ret = this.dataHandler._handleSubscription(payload)
        // assertions
        var subscription = this.mocks.subscription
        expect(ret).to.equal(subscription)
        var queryExecutor = this.mocks.queryExecutor
        sinon.assert.calledOnce(queryExecutor.observe)
        sinon.assert.calledWith(queryExecutor.observe, payload)
        var observable = this.mocks.observable
        var callbacks = this.mocks.subscribeCallbacks
        sinon.assert.calledOnce(observable.subscribe)
        sinon.assert.calledWith(observable.subscribe,
          callbacks.onNext,
          callbacks.onError,
          callbacks.onCompleted)
        var activeSubscriptions = this.mocks.activeSubscriptions
        sinon.assert.calledOnce(activeSubscriptions.add)
        sinon.assert.calledWith(activeSubscriptions.add,
          this.spark.id, payload.id, subscription)
      })
    })
  })
})
