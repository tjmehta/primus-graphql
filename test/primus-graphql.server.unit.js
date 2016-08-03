var EventEmitter = require('events').EventEmitter

var expect = require('code').expect
var proxyquire = require('proxyquire')
var sinon = require('sinon')
require('sinon-as-promised')

var describe = global.describe
var it = global.it
var beforeEach = global.beforeEach
var afterEach = global.afterEach

var createServerPlugin = require('../src/primus-graphql.server.js')
var defaultPrimusOpts = require('../src/default-primus-opts.js')
var schema = require('./fixtures/graphql-schema.js')

describe('primus-graphql server', function () {
  beforeEach(function () {
    global.primus = new EventEmitter()
  })
  afterEach(function () {
    delete global.primus
  })

  describe('createServerPlugin()', function () {
    it('should create server plugin', function () {
      var plugin = createServerPlugin({ schema: schema })
      expect(plugin).to.exist()
      expect(plugin).to.be.a.function()
    })
  })

  describe('serverPlugin', function () {
    beforeEach(function () {
      this.respondEE = new EventEmitter()
      this.mocks = {}
      this.mocks.dataHandler = {
        handleClose: sinon.stub(),
        handleData: sinon.stub()
      }
      this.mocks.DataHandler = sinon.stub().returns(this.mocks.dataHandler)
      var createServerPlugin = proxyquire('../src/primus-graphql.server.js', {
        './server/data-handler.js': this.mocks.DataHandler
      })
      this.opts = {
        schema: {},
        validationRules: ['hey']
      }
      this.plugin = createServerPlugin(this.opts)
      this.MockPrimus = {}
      this.MockSpark = function () {}
      this.MockSpark.prototype = new EventEmitter()
      this.MockPrimus.Spark = this.MockSpark
    })

    it('should extend Spark', function () {
      this.plugin(this.MockPrimus)
      expect(this.MockSpark.prototype.graphql).to.exist()
      expect(this.MockSpark.prototype.graphql).to.be.a.function()
    })

    describe('spark.graphql()', function () {
      beforeEach(function () {
        this.plugin(this.MockPrimus)
        this.spark = new this.MockSpark()
      })

      it('should not attach handler twice', function () {
        var spark = this.spark
        expect(spark.listeners('data').length).to.equal(0)
        spark.graphql()
        spark.graphql()
        expect(spark.listeners('data').length).to.equal(1)
      })

      it('should handle data w/ "handleData"', function () {
        var spark = this.spark
        spark.graphql()
        var data = {}
        data[defaultPrimusOpts.key] = {}
        spark.emit('data', data)
        sinon.assert.calledOnce(this.mocks.dataHandler.handleData)
        sinon.assert.calledWith(this.mocks.dataHandler.handleData, data)
      })
    })
  })
})
