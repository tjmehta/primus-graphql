var expect = require('code').expect
var Observable = require('rxjs/Observable').Observable
var shimmer = require('shimmer')
var sinon = require('sinon')
var StaticObservable = require('static-observable')
require('observable-backoff')
require('rxjs/add/operator/publish')
require('sinon-as-promised')

var describe = global.describe
var it = global.it
var afterEach = global.afterEach
var beforeEach = global.beforeEach

var RelayNetworkLayer = require('../src/client/relay-network-layer.js')

describe('relay-network-layer', function () {
  describe('constructor', function () {
    it('should create a relay network layer', function () {
      var primus = {}
      var networkLayer = new RelayNetworkLayer(primus)
      expect(networkLayer.primus).to.equal(primus)
      expect(networkLayer.opts).to.deep.equal({
        timeout: 15000,
        retry: {
          minTimeout: 1000,
          maxTimeout: 3000,
          factor: 3,
          retries: 2
        }
      })
    })
  })

  describe('methods', function () {
    beforeEach(function () {
      this.primus = {
        graphql: sinon.stub()
      }
      this.opts = {}
      this.networkLayer = new RelayNetworkLayer(this.primus, this.opts)
    })

    describe('sendMutation', function () {
      beforeEach(function () {
        this.mutationRequest = {
          getDebugName: sinon.stub().returns('debugName'),
          getQueryString: sinon.stub(),
          getVariables: sinon.stub(),
          getFiles: sinon.stub(),
          resolve: sinon.stub(),
          reject: sinon.stub()
        }
      })

      it('should handle payload errors', function () {
        // stubs
        var req = this.mutationRequest
        req.getQueryString.returns('query')
        req.getVariables.returns({})
        req.getFiles.returns(null)
        var payload = { errors: [new Error('boom')] }
        this.primus.graphql.resolves(payload)
        // send mutation
        return this.networkLayer.sendMutation(this.mutationRequest)
          .then(function () {
            sinon.assert.calledOnce(req.reject)
            var err = req.reject.args[0][0]
            expect(err.message).to.equal('Server request for mutation `debugName` failed for the following reasons:\n\n1. boom')
            expect(err.source).to.equal(payload)
          })
      })

      it('should handle payload errors (w/ locations)', function () {
        // stubs
        var req = this.mutationRequest
        req.getQueryString.returns('query')
        req.getVariables.returns({})
        req.getFiles.returns(null)
        var err = new Error('boom')
        err.locations = [{
          column: 1,
          line: 1
        }]
        var payload = { errors: [err] }
        this.primus.graphql.resolves(payload)
        // send mutation
        return this.networkLayer.sendMutation(this.mutationRequest)
          .then(function () {
            sinon.assert.calledOnce(req.reject)
            var err = req.reject.args[0][0]
            expect(err.message).to.equal('Server request for mutation `debugName` failed for the following reasons:\n\n1. boom\n   query\n   ^^^')
            expect(err.source).to.equal(payload)
          })
      })

      it('should handle payload', function () {
        // stubs
        var req = this.mutationRequest
        req.getQueryString.returns('query')
        req.getVariables.returns({})
        req.getFiles.returns(null)
        var payload = { data: 1 }
        this.primus.graphql.resolves(payload)
        // send mutation
        return this.networkLayer.sendMutation(this.mutationRequest)
          .then(function () {
            sinon.assert.calledOnce(req.resolve)
            sinon.assert.calledWith(req.resolve, { response: payload.data })
          })
      })

      it('should handle error', function () {
        // stubs
        var req = this.mutationRequest
        req.getQueryString.returns('query')
        req.getVariables.returns({})
        req.getFiles.returns(null)
        var err = new Error('boom')
        this.primus.graphql.rejects(err)
        // send mutation
        return this.networkLayer.sendMutation(this.mutationRequest)
          .then(function () {
            sinon.assert.calledOnce(req.reject)
            sinon.assert.calledWith(req.reject, err)
          })
      })
    })

    describe('sendSubscription', function () {
      var expectBound = function (expected) {
        return sinon.match(function (actual) {
          expect(actual.__bound).to.equal(expected)
          return true
        })
      }
      var expectName = function (name) {
        return sinon.match(function (actual) {
          expect(actual.name).to.equal(name)
          return true
        })
      }

      beforeEach(function () {
        var self = this
        this.query = 'query'
        this.variables = {}
        this.subscriptionRequest = {
          onCompleted: sinon.stub(),
          onError: sinon.stub(),
          onNext: sinon.stub(),
          getQueryString: sinon.stub().returns(this.query),
          getVariables: sinon.stub().returns(this.variables)
        }
        this.observable = new StaticObservable()
        shimmer.wrap(Observable.prototype, 'backoff', function (orig) {
          return function () {
            var ret = orig.apply(this, arguments)
            self.backoffObservable = ret
            sinon.spy(self.backoffObservable, 'subscribe')
            return ret
          }
        })
        shimmer.wrap(Function.prototype, 'bind', function (orig) {
          return function () {
            var bound = orig.apply(this, arguments)
            bound.__bound = this
            return bound
          }
        })
      })
      afterEach(function () {
        shimmer.unwrap(Observable.prototype, 'backoff')
        shimmer.unwrap(Function.prototype, 'bind')
      })

      it('should subscribe to retryable observable and return rx-subscription', function () {
        this.primus.graphql.returns(this.observable)
        var rxSubscription = this.networkLayer.sendSubscription(this.subscriptionRequest)
        expect(rxSubscription).to.exist()
        expect(rxSubscription.unsubscribe).to.be.a.function()
        sinon.assert.calledOnce(this.backoffObservable.subscribe)
        sinon.assert.calledWith(this.backoffObservable.subscribe,
          expectBound(this.subscriptionRequest.onNext),
          expectName('onFinalError'),
          expectBound(this.subscriptionRequest.onCompleted))
      })

      describe('errors', function () {
        describe('error w/ stack', function () {
          beforeEach(function () {
            this.err = new Error('boom')
            this.observable.error(this.err)
          })

          it('should call onError (no retries)', function () {
            this.opts.retry.retries = 0
            this.primus.graphql.returns(this.observable)
            var rxSubscription = this.networkLayer.sendSubscription(this.subscriptionRequest)
            expect(rxSubscription).to.exist()
            expect(rxSubscription.unsubscribe).to.be.a.function()
            sinon.assert.calledOnce(this.subscriptionRequest.onError)
            sinon.assert.calledWith(this.subscriptionRequest.onError, sinon.match(function (err) {
              expect(err.message).to.equal([
                'sendSubscription(): Failed to maintain subscription to server,',
                'tried 1 times.'
              ].join(' '))
              return true
            }))
          })

          it('should call onError (retries)', function () {
            this.primus.graphql.returns(this.observable)
            var rxSubscription = this.networkLayer.sendSubscription(this.subscriptionRequest)
            expect(rxSubscription).to.exist()
            expect(rxSubscription.unsubscribe).to.be.a.function()
          })
        })

        describe('err no stack', function () {
          beforeEach(function () {
            this.err = new Error('')
            delete this.err.stack
            this.observable.error(this.err)
          })

          it('should call onError (retries)', function () {
            this.primus.graphql.returns(this.observable)
            var rxSubscription = this.networkLayer.sendSubscription(this.subscriptionRequest)
            expect(rxSubscription).to.exist()
            expect(rxSubscription.unsubscribe).to.be.a.function()
          })
        })
      })
    })

    describe('sendQueries', function () {
      beforeEach(function () {
        sinon.stub(this.networkLayer, '_sendQueryWithRetries')
        this.queryRequest = {
          getDebugName: sinon.stub().returns('debugName'),
          getQueryString: sinon.stub(),
          getVariables: sinon.stub(),
          resolve: sinon.stub(),
          reject: sinon.stub()
        }
      })

      it('should handle payload errors', function () {
        // stubs
        var req = this.queryRequest
        req.getQueryString.returns('query')
        req.getVariables.returns({})
        var payload = { errors: [new Error('boom')] }
        this.networkLayer._sendQueryWithRetries.resolves(payload)
        // send mutation
        return this.networkLayer.sendQueries([this.queryRequest])
          .then(function () {
            sinon.assert.calledOnce(req.reject)
            var err = req.reject.args[0][0]
            expect(err.message).to.equal('Server request for query `debugName` failed for the following reasons:\n\n1. boom')
            expect(err.source).to.equal(payload)
          })
      })

      it('should handle payload w/out data', function () {
        // stubs
        var req = this.queryRequest
        req.getQueryString.returns('query')
        req.getVariables.returns({})
        var payload = { }
        this.networkLayer._sendQueryWithRetries.resolves(payload)
        // send mutation
        return this.networkLayer.sendQueries([this.queryRequest])
          .then(function () {
            sinon.assert.calledOnce(req.reject)
            var err = req.reject.args[0][0]
            expect(err.message).to.equal('Server response was missing for query `debugName`.')
            expect(err.source).to.equal(payload)
          })
      })

      it('should handle payload', function () {
        // stubs
        var req = this.queryRequest
        req.getQueryString.returns('query')
        req.getVariables.returns({})
        var payload = { data: 1 }
        this.networkLayer._sendQueryWithRetries.resolves(payload)
        // send mutation
        return this.networkLayer.sendQueries([this.queryRequest])
          .then(function () {
            sinon.assert.calledOnce(req.resolve)
            sinon.assert.calledWith(req.resolve, { response: payload.data })
          })
      })

      it('should handle error', function () {
        // stubs
        var req = this.queryRequest
        req.getQueryString.returns('query')
        req.getVariables.returns({})
        var err = new Error('boom')
        this.networkLayer._sendQueryWithRetries.rejects(err)
        // send mutation
        return this.networkLayer.sendQueries([this.queryRequest])
          .then(function () {
            sinon.assert.calledOnce(req.reject)
            sinon.assert.calledWith(req.reject, err)
          })
      })
    })

    describe('supports', function () {
      it('should return false', function () {
        var ret = this.networkLayer.supports()
        expect(ret).to.be.false()
      })
    })

    describe('_sendQueryWithRetries', function () {
      beforeEach(function () {
        this.queryRequest = {
          getDebugName: sinon.stub().returns('debugName'),
          getQueryString: sinon.stub(),
          getVariables: sinon.stub(),
          resolve: sinon.stub(),
          reject: sinon.stub()
        }
      })

      it('should handle 2xx payload', function () {
        // stubs
        var req = this.queryRequest
        req.getQueryString.returns('query')
        req.getVariables.returns({})
        var payload = { statusCode: 200, data: 1 }
        this.primus.graphql.resolves(payload)
        // send query
        return this.networkLayer._sendQueryWithRetries(this.queryRequest)
          .then(function (_payload) {
            expect(_payload).to.equal(payload)
          })
      })

      it('should retry 4xx payload (no errors)', function (done) {
        // opts
        var primus = this.primus
        var opts = this.networkLayer.opts
        opts.retry.minTimeout = 1 // ms
        opts.retry.maxTimeout = 1
        // stubs
        var req = this.queryRequest
        req.getQueryString.returns('query')
        req.getVariables.returns({})
        var payload = { statusCode: 400, data: 1 }
        this.primus.graphql.resolves(payload)
        // send query
        this.networkLayer._sendQueryWithRetries(this.queryRequest)
          .then(function () {
            done(new Error('should throw an error'))
          })
          .catch(function (err) {
            sinon.assert.calledThrice(primus.graphql)
            expect(err.message).to.equal([
              'sendQueryWithRetries(): Failed to get response from server,',
              'tried', opts.retry.retries + 1, 'times.'
            ].join(' '))
            done()
          })
          .catch(done)
      })

      it('should retry 4xx payload (errors)', function (done) {
        // opts
        var primus = this.primus
        var opts = this.networkLayer.opts
        opts.retry.minTimeout = 1 // ms
        opts.retry.maxTimeout = 1
        // stubs
        var req = this.queryRequest
        req.getQueryString.returns('query')
        req.getVariables.returns({})
        var payload = { statusCode: 400, errors: [new Error('foo')] }
        this.primus.graphql.resolves(payload)
        // send query
        this.networkLayer._sendQueryWithRetries(this.queryRequest)
          .then(function () {
            done(new Error('should throw an error'))
          })
          .catch(function (err) {
            sinon.assert.calledThrice(primus.graphql)
            expect(err.message).to.equal([
              'sendQueryWithRetries(): Failed to get response from server,',
              'tried', opts.retry.retries + 1, 'times.'
            ].join(' '))
            done()
          })
          .catch(done)
      })

      it('should retry 4xx payload (errors no stack)', function (done) {
        // opts
        var primus = this.primus
        var opts = this.networkLayer.opts
        opts.retry.minTimeout = 1 // ms
        opts.retry.maxTimeout = 1
        // stubs
        var req = this.queryRequest
        req.getQueryString.returns('query')
        req.getVariables.returns({})
        var payload = { statusCode: 400, errors: [{message: 'Error: foo'}] }
        this.primus.graphql.resolves(payload)
        // send query
        this.networkLayer._sendQueryWithRetries(this.queryRequest)
          .then(function () {
            done(new Error('should throw an error'))
          })
          .catch(function (err) {
            sinon.assert.calledThrice(primus.graphql)
            expect(err.message).to.equal([
              'sendQueryWithRetries(): Failed to get response from server,',
              'tried', opts.retry.retries + 1, 'times.'
            ].join(' '))
            done()
          })
          .catch(done)
      })
    })
  })
})
