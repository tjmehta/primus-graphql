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
var defaultOpts = require('../src/default-opts.js')
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
      var self = this
      this.respondEE = new EventEmitter()
      this.mockGraphQL = {
        execute: sinon.stub(),
        parse: sinon.stub(),
        Source: sinon.stub(),
        specifiedRules: [],
        validate: sinon.stub()
      }
      this.mockRespondUtils = {
        respond: sinon.spy(function () {
          self.respondEE.emit('respond')
        }),
        respondErrs: sinon.spy(function () {
          self.respondEE.emit('respond')
        })
      }
      var createServerPlugin = proxyquire('../src/primus-graphql.server.js', {
        'graphql': this.mockGraphQL,
        './respond-utils.js': this.mockRespondUtils
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
        spark.graphql()
        spark.graphql()
        expect(spark.listeners('data').length).to.equal(1)
      })

      it('should ignore non-graphql data', function () {
        var spark = this.spark
        spark.graphql()
        var handlers = spark.listeners('data')
        var handler = handlers[0] = sinon.stub()
        spark.emit('data', {})
        sinon.assert.notCalled(handler)
      })

      it('should handle graphql data', function (done) {
        var spark = this.spark
        spark.graphql()
        var reqPayload = {
          id: 1,
          query: 'query',
          variables: {}
        }
        var data = {}
        data[defaultOpts.key] = reqPayload
        // mocks and stubs
        var mockGraphQL = this.mockGraphQL
        var mockRespondUtils = this.mockRespondUtils
        var opts = this.opts
        var mockSource = {}
        mockGraphQL.Source.returns(mockSource)
        var mockDocumentAST = {}
        mockGraphQL.parse.returns(mockDocumentAST)
        var mockValidationErrors = []
        mockGraphQL.validate.returns(mockValidationErrors)
        var mockPayload = {}
        mockGraphQL.execute.resolves(mockPayload)
        // assertions
        this.respondEE.once('respond', function () {
          sinon.assert.calledOnce(mockGraphQL.Source)
          sinon.assert.calledWith(mockGraphQL.Source, reqPayload.query, 'GraphQL request')
          sinon.assert.calledOnce(mockGraphQL.parse)
          sinon.assert.calledWith(mockGraphQL.parse, mockSource)
          sinon.assert.calledOnce(mockGraphQL.validate)
          sinon.assert.calledWith(mockGraphQL.validate,
            opts.schema,
            mockDocumentAST,
            mockGraphQL.specifiedRules.concat(opts.validationRules))
          sinon.assert.calledOnce(mockGraphQL.execute)
          sinon.assert.calledWith(mockGraphQL.execute,
            opts.schema,
            mockDocumentAST,
            opts.rootValue,
            opts.context,
            reqPayload.variables,
            reqPayload.operationName)
          sinon.assert.calledOnce(mockRespondUtils.respond)
          sinon.assert.calledWith(mockRespondUtils.respond,
            spark,
            reqPayload.id,
            200,
            mockPayload,
            opts,
            defaultOpts)
          done()
        })
        // graphql request
        spark.emit('data', data)
      })

      describe('errors', function () {
        it('should handle graphql "options.context" syntax error', function (done) {
          var spark = this.spark
          spark.graphql()
          var reqPayload = {
            id: 1,
            query: 'query',
            variables: {}
          }
          var data = {}
          data[defaultOpts.key] = reqPayload
          // mocks and stubs
          var mockGraphQL = this.mockGraphQL
          var mockRespondUtils = this.mockRespondUtils
          var opts = this.opts
          var err = new Error('boom')
          this.opts.context = sinon.stub().throws(err)
          mockGraphQL.Source.throws(err)
          // assertions
          this.respondEE.once('respond', function () {
            sinon.assert.calledOnce(mockRespondUtils.respondErrs)
            sinon.assert.calledWith(mockRespondUtils.respondErrs,
              spark,
              reqPayload.id,
              400,
              [err],
              opts,
              defaultOpts)
            done()
          })
          // graphql request
          spark.emit('data', data)
        })

        it('should handle graphql "options.rootValue" syntax error', function (done) {
          var spark = this.spark
          spark.graphql()
          var reqPayload = {
            id: 1,
            query: 'query',
            variables: {}
          }
          var data = {}
          data[defaultOpts.key] = reqPayload
          // mocks and stubs
          var mockGraphQL = this.mockGraphQL
          var mockRespondUtils = this.mockRespondUtils
          var opts = this.opts
          var err = new Error('boom')
          this.opts.rootValue = sinon.stub().throws(err)
          mockGraphQL.Source.throws(err)
          // assertions
          this.respondEE.once('respond', function () {
            sinon.assert.calledOnce(mockRespondUtils.respondErrs)
            sinon.assert.calledWith(mockRespondUtils.respondErrs,
              spark,
              reqPayload.id,
              400,
              [err],
              opts,
              defaultOpts)
            done()
          })
          // graphql request
          spark.emit('data', data)
        })

        it('should handle graphql "source" syntax error', function (done) {
          var spark = this.spark
          spark.graphql()
          var reqPayload = {
            id: 1,
            query: 'query',
            variables: {}
          }
          var data = {}
          data[defaultOpts.key] = reqPayload
          // mocks and stubs
          var mockGraphQL = this.mockGraphQL
          var mockRespondUtils = this.mockRespondUtils
          var opts = this.opts
          var err = new Error('boom')
          mockGraphQL.Source.throws(err)
          // assertions
          this.respondEE.once('respond', function () {
            sinon.assert.calledOnce(mockGraphQL.Source)
            sinon.assert.calledWith(mockGraphQL.Source, reqPayload.query, 'GraphQL request')
            sinon.assert.calledOnce(mockRespondUtils.respondErrs)
            sinon.assert.calledWith(mockRespondUtils.respondErrs,
              spark,
              reqPayload.id,
              400,
              [err],
              opts,
              defaultOpts)
            done()
          })
          // graphql request
          spark.emit('data', data)
        })

        it('should handle graphql "parse" syntax error', function (done) {
          var spark = this.spark
          spark.graphql()
          var reqPayload = {
            id: 1,
            query: 'query',
            variables: {}
          }
          var data = {}
          data[defaultOpts.key] = reqPayload
          // mocks and stubs
          var mockGraphQL = this.mockGraphQL
          var mockRespondUtils = this.mockRespondUtils
          var opts = this.opts
          var mockSource = {}
          mockGraphQL.Source.returns(mockSource)
          var err = new Error('boom')
          mockGraphQL.parse.throws(err)
          // assertions
          this.respondEE.once('respond', function () {
            sinon.assert.calledOnce(mockGraphQL.Source)
            sinon.assert.calledWith(mockGraphQL.Source, reqPayload.query, 'GraphQL request')
            sinon.assert.calledOnce(mockGraphQL.parse)
            sinon.assert.calledWith(mockGraphQL.parse, mockSource)
            sinon.assert.calledOnce(mockRespondUtils.respondErrs)
            sinon.assert.calledWith(mockRespondUtils.respondErrs,
              spark,
              reqPayload.id,
              400,
              [err],
              opts,
              defaultOpts)
            done()
          })
          // graphql request
          spark.emit('data', data)
        })

        it('should handle graphql "validate" syntax error', function (done) {
          var spark = this.spark
          spark.graphql()
          var reqPayload = {
            id: 1,
            query: 'query',
            variables: {}
          }
          var data = {}
          data[defaultOpts.key] = reqPayload
          // mocks and stubs
          var mockGraphQL = this.mockGraphQL
          var mockRespondUtils = this.mockRespondUtils
          var opts = this.opts
          var mockSource = {}
          mockGraphQL.Source.returns(mockSource)
          var mockDocumentAST = {}
          mockGraphQL.parse.returns(mockDocumentAST)
          var err = new Error('boom')
          var mockValidationErrors = [err]
          mockGraphQL.validate.returns(mockValidationErrors)
          // assertions
          this.respondEE.once('respond', function () {
            sinon.assert.calledOnce(mockGraphQL.Source)
            sinon.assert.calledWith(mockGraphQL.Source, reqPayload.query, 'GraphQL request')
            sinon.assert.calledOnce(mockGraphQL.parse)
            sinon.assert.calledWith(mockGraphQL.parse, mockSource)
            sinon.assert.calledOnce(mockGraphQL.validate)
            sinon.assert.calledWith(mockGraphQL.validate,
              opts.schema,
              mockDocumentAST,
              mockGraphQL.specifiedRules.concat(opts.validationRules))
            sinon.assert.calledOnce(mockRespondUtils.respondErrs)
            sinon.assert.calledWith(mockRespondUtils.respondErrs,
              spark,
              reqPayload.id,
              400,
              [err],
              opts,
              defaultOpts)
            done()
          })
          // graphql request
          spark.emit('data', data)
        })

        it('should handle graphql "execute" error', function (done) {
          var spark = this.spark
          spark.graphql()
          var reqPayload = {
            id: 1,
            query: 'query',
            variables: {}
          }
          var data = {}
          data[defaultOpts.key] = reqPayload
          // mocks and stubs
          var mockGraphQL = this.mockGraphQL
          var mockRespondUtils = this.mockRespondUtils
          var opts = this.opts
          var mockSource = {}
          mockGraphQL.Source.returns(mockSource)
          var mockDocumentAST = {}
          mockGraphQL.parse.returns(mockDocumentAST)
          var mockValidationErrors = []
          mockGraphQL.validate.returns(mockValidationErrors)
          var err = new Error('boom')
          mockGraphQL.execute.rejects(err)
          // assertions
          this.respondEE.once('respond', function () {
            sinon.assert.calledOnce(mockGraphQL.Source)
            sinon.assert.calledWith(mockGraphQL.Source, reqPayload.query, 'GraphQL request')
            sinon.assert.calledOnce(mockGraphQL.parse)
            sinon.assert.calledWith(mockGraphQL.parse, mockSource)
            sinon.assert.calledOnce(mockGraphQL.validate)
            sinon.assert.calledWith(mockGraphQL.validate,
              opts.schema,
              mockDocumentAST,
              mockGraphQL.specifiedRules.concat(opts.validationRules))
            sinon.assert.calledOnce(mockGraphQL.execute)
            sinon.assert.calledWith(mockGraphQL.execute,
              opts.schema,
              mockDocumentAST,
              opts.rootValue,
              opts.context,
              reqPayload.variables,
              reqPayload.operationName)
            sinon.assert.calledOnce(mockRespondUtils.respondErrs)
            sinon.assert.calledWith(mockRespondUtils.respondErrs,
              spark,
              reqPayload.id,
              400,
              [err],
              opts,
              defaultOpts)
            done()
          })
          // graphql request
          spark.emit('data', data)
        })
      })
    })
  })
})
