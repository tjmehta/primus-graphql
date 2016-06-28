var expect = require('code').expect
var sinon = require('sinon')
require('sinon-as-promised')

var describe = global.describe
var it = global.it
var beforeEach = global.beforeEach

var RelayNetworkLayer = require('../src/relay-network-layer.js')

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
    })

    describe('sendMutation', function () {
      beforeEach(function () {
        this.networkLayer = new RelayNetworkLayer(this.primus)
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

    describe('sendQueries', function () {
      beforeEach(function () {
        this.networkLayer = new RelayNetworkLayer(this.primus)
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
      beforeEach(function () {
        this.networkLayer = new RelayNetworkLayer(this.primus)
      })

      it('should return false', function () {
        var ret = this.networkLayer.supports()
        expect(ret).to.be.false()
      })
    })

    describe('_sendQueryWithRetries', function () {
      beforeEach(function () {
        this.networkLayer = new RelayNetworkLayer(this.primus)
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
        console.log()
        return this.networkLayer._sendQueryWithRetries(this.queryRequest)
          .then(function (_payload) {
            expect(_payload).to.equal(payload)
          })
      })

      it('should retry 4xx payload', function (done) {
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
              'tried', opts.retry.retries, 'times.'
            ].join(' '))
            done()
          })
          .catch(done)
      })
    })
  })
})
