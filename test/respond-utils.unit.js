var EventEmitter = require('events').EventEmitter

var assign = require('101/assign')
var omit = require('101/omit')
var sinon = require('sinon')
require('sinon-as-promised')

var describe = global.describe
var it = global.it
var afterEach = global.afterEach
var beforeEach = global.beforeEach

var defaultOpts = require('../src/default-opts.js')
var respondUtils = require('../src/respond-utils.js')

describe('respond-utils', function () {
  beforeEach(function () {
    this.spark = new EventEmitter()
    this.spark.write = sinon.stub()
  })

  it('should respond', function () {
    var id = 1
    var statusCode = 200
    var data = {
      data: {
        foo: 1,
        bar: 1
      }
    }
    var opts = {}
    respondUtils.respond(this.spark, id, statusCode, data, opts, defaultOpts)
    sinon.assert.calledOnce(this.spark.write)
    var expected = {}
    expected[defaultOpts.key] = assign({
      id: id,
      statusCode: 200
    }, data)
    sinon.assert.calledWith(this.spark.write, expected)
  })

  describe('respondErrs', function () {
    beforeEach(function () {
      sinon.stub(respondUtils, 'respond')
    })
    afterEach(function () {
      respondUtils.respond.restore()
    })

    it('should respondErrs', function () {
      var id = 1
      var statusCode = 400
      var errors = [new Error('hey')]
      var opts = {}
      respondUtils.respondErrs(this.spark, id, statusCode, errors, opts, defaultOpts)
      sinon.assert.calledOnce(respondUtils.respond)
      sinon.assert.calledWith(respondUtils.respond,
        this.spark, id, statusCode, { errors: errors }, opts, defaultOpts)
    })

    describe('formatError', function () {
      it('should respondErrs', function () {
        var id = 1
        var statusCode = 400
        var errors = [new Error('hey')]
        var opts = {
          formatError: sinon.spy(function (v) { return v })
        }
        respondUtils.respondErrs(this.spark, id, statusCode, errors, opts, defaultOpts)
        sinon.assert.calledOnce(respondUtils.respond)
        sinon.assert.calledWith(respondUtils.respond,
          this.spark, id, statusCode, { errors: errors }, opts, defaultOpts)
        sinon.assert.calledOnce(opts.formatError)
        sinon.assert.calledWith(opts.formatError, errors[0])
      })

      it('should respond error if errors', function () {
        var id = 1
        var statusCode = 400
        var formatErr = new Error('format')
        var errors = [new Error('hey')]
        var opts = {
          formatError: sinon.stub().throws(formatErr)
        }
        respondUtils.respondErrs(this.spark, id, statusCode, errors, opts, defaultOpts)
        sinon.assert.calledOnce(respondUtils.respond)
        sinon.assert.calledWith(respondUtils.respond,
          this.spark, id, statusCode, { errors: [formatErr] }, omit(opts, 'formatError'), defaultOpts)
        sinon.assert.calledOnce(opts.formatError)
        sinon.assert.calledWith(opts.formatError, formatErr)
      })
    })
  })
})
