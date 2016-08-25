var EventEmitter = require('events').EventEmitter

var expect = require('code').expect
var proxyquire = require('proxyquire')
var sinon = require('sinon')
require('sinon-as-promised')

var describe = global.describe
var it = global.it
var beforeEach = global.beforeEach
var afterEach = global.afterEach

var activeSubscriptions = require('../src/server/active-subscriptions.js')
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
      this.mockPrimus = new EventEmitter()
      this.MockSpark = function () {}
      this.MockSpark.prototype = new EventEmitter()
      this.mockPrimus.Spark = this.MockSpark
    })

    it('should extend Spark and attach listeners', function () {
      this.plugin(this.mockPrimus)
      expect(this.MockSpark.prototype.graphql).to.exist()
      expect(this.MockSpark.prototype.graphql).to.be.a.function()
      expect(this.mockPrimus.listeners('connection').length).to.equal(1)
      expect(this.mockPrimus.listeners('disconnection').length).to.equal(1)
    })

    describe('spark.graphql()', function () {
      beforeEach(function () {
        this.plugin(this.mockPrimus)
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

    describe('primus.graphql()', function () {
      beforeEach(function () {
        this.mockPrimus = new EventEmitter()
        this.mockPrimus.__graphqlListening = true
        this.MockSpark = function () {}
        this.MockSpark.prototype = new EventEmitter()
        this.mockPrimus.Spark = this.MockSpark
        this.plugin(this.mockPrimus)
        this.mockPrimus.__graphqlListening = false
        this.spark = new this.MockSpark()
        sinon.stub(this.spark, 'graphql')
        sinon.stub(activeSubscriptions, 'unsubscribeAll')
      })
      afterEach(function () {
        activeSubscriptions.unsubscribeAll.restore()
      })

      it('should not attach handler twice', function () {
        var primus = this.mockPrimus
        expect(primus.listeners('connection').length).to.equal(0)
        expect(primus.listeners('disconnection').length).to.equal(0)
        primus.graphql()
        expect(primus.listeners('connection').length).to.equal(1)
        expect(primus.listeners('disconnection').length).to.equal(1)
        primus.graphql()
        expect(primus.listeners('connection').length).to.equal(1)
        expect(primus.listeners('disconnection').length).to.equal(1)
      })

      it('should handle connections and invoke graphql to attach "dataHandler"', function () {
        var primus = this.mockPrimus
        primus.graphql()
        primus.emit('connection', this.spark)
        sinon.assert.calledOnce(this.spark.graphql)
      })

      it('should handle disconnections by removing all active-subscriptions for spark', function () {
        var primus = this.mockPrimus
        primus.graphql()
        primus.emit('disconnection', this.spark)
        sinon.assert.calledOnce(activeSubscriptions.unsubscribeAll)
        sinon.assert.calledWith(activeSubscriptions.unsubscribeAll, this.spark.id)
      })
    })
  })
})
