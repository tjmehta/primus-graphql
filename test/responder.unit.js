var EventEmitter = require('events').EventEmitter

var assign = require('101/assign')
var omit = require('101/omit')
var errToJSON = require('error-to-json')
var sinon = require('sinon')
require('sinon-as-promised')

var describe = global.describe
var it = global.it
var afterEach = global.afterEach
var beforeEach = global.beforeEach

var defaultOpts = require('../src/default-opts.js')
var defaultPrimusOpts = require('../src/default-primus-opts.js')
var Responder = require('../src/server/responder.js')

describe('responder', function () {
  beforeEach(function () {
    this.opts = defaultOpts
    this.primusOpts = defaultPrimusOpts
    this.mocks = {
      spark: {
        write: sinon.stub()
      }
    }
    this.responder = new Responder(this.mocks.spark, this.opts, this.primusOpts)
  })

  describe('send', function () {
    it('should send data-payload to client', function () {
      var id = 'id'
      var statusCode = 200
      var payload = {
        data: {}
      }
      this.responder.send(id, statusCode, payload)
      // assertions
      var spark = this.mocks.spark
      sinon.assert.calledOnce(spark.write)
      var expectedData = {}
      expectedData[this.primusOpts.key] = {
        id: id,
        statusCode: statusCode,
        data: payload.data
      }
      sinon.assert.calledWith(spark.write, expectedData)
    })
  })

  describe('sendErrs', function () {
    it('should send errors-payload to client', function () {
      var id = 'id'
      var statusCode = 401
      var errors = [ new Error('message') ]
      this.responder.sendErrs(id, statusCode, errors)
      // assertions
      var spark = this.mocks.spark
      sinon.assert.calledOnce(spark.write)
      var expectedData = {}
      expectedData[this.primusOpts.key] = {
        id: id,
        statusCode: statusCode,
        errors: errors.map(errToJSON)
      }
      sinon.assert.calledWith(spark.write, expectedData)
    })

    describe('formatError err', function() {
      beforeEach(function () {
        this.err = new Error('format error')
        // cache and replace
        sinon.stub(this.opts, 'formatError').throws(this.err)
      })
      afterEach(function () {
        // restore
        this.opts.formatError.restore()
      })

      it('should catch formatError errors', function() {
        var id = 'id'
        var statusCode = 401
        var errors = [ new Error('message') ]
        this.responder.sendErrs(id, statusCode, errors)
        // assertions
        var spark = this.mocks.spark
        var expectedData = {}
        expectedData[this.primusOpts.key] = {
          id: id,
          statusCode: 500,
          errors: errors.concat(this.err)
        }
        sinon.assert.calledOnce(spark.write)
        sinon.assert.calledWith(spark.write, expectedData)
      })
    })
  })

  describe('sendEvent', function () {
    it('should send next-event-payload to client', function () {
      var id = 'id'
      var event = 'next'
      var data = {}
      this.responder.sendEvent(id, event, data)
      // assertions
      var spark = this.mocks.spark
      var expectedData = {}
      expectedData[this.primusOpts.key] = {
        id: id,
        statusCode: 200,
        event: event,
        data: data
      }
      sinon.assert.calledOnce(spark.write)
      sinon.assert.calledWith(spark.write, expectedData)
    })

    it('should send completed-event-payload to client', function () {
      var id = 'id'
      var event = 'completed'
      this.responder.sendEvent(id, event)
      // assertions
      var spark = this.mocks.spark
      var expectedData = {}
      expectedData[this.primusOpts.key] = {
        id: id,
        statusCode: 200,
        event: event
      }
      sinon.assert.calledOnce(spark.write)
      sinon.assert.calledWith(spark.write, expectedData)
    })

    it('should send error-event-payload to client', function () {
      var id = 'id'
      var event = 'error'
      var err = new Error('boom')
      this.responder.sendEvent(id, event, err)
      // assertions
      var spark = this.mocks.spark
      var expectedData = {}
      expectedData[this.primusOpts.key] = {
        id: id,
        statusCode: 500,
        event: event,
        errors: [err].map(errToJSON)
      }
      sinon.assert.calledOnce(spark.write)
      sinon.assert.calledWith(spark.write, expectedData)
    })

    it('should send error-event-payload to client (err.statusCode)', function () {
      var id = 'id'
      var event = 'error'
      var err = new Error('boom')
      err.statusCode = 401
      this.responder.sendEvent(id, event, err)
      // assertions
      var spark = this.mocks.spark
      var expectedData = {}
      expectedData[this.primusOpts.key] = {
        id: id,
        statusCode: err.statusCode,
        event: event,
        errors: [err].map(errToJSON)
      }
      sinon.assert.calledOnce(spark.write)
      sinon.assert.calledWith(spark.write, expectedData)
    })

    it('should send error-event-payload to client (err.errors)', function () {
      var id = 'id'
      var event = 'error'
      var err = new Error('boom')
      err.statusCode = 401
      var multiErr = new Error('multiple')
      multiErr.errors = [err]
      this.responder.sendEvent(id, event, multiErr)
      // assertions
      var spark = this.mocks.spark
      var expectedData = {}
      expectedData[this.primusOpts.key] = {
        id: id,
        statusCode: err.statusCode,
        event: event,
        errors: [err].map(errToJSON)
      }
      sinon.assert.calledOnce(spark.write)
      sinon.assert.calledWith(spark.write, expectedData)
    })
  })
})
