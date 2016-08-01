var describe = global.describe
var it = global.it
var beforeEach = global.beforeEach
var afterEach = global.afterEach

var compose = require('101/compose')
var expect = require('code').expect
var once = require('once')
var noop = require('101/noop')
var pluck = require('101/pluck')
var proxyquire = require('proxyquire')
var sinon = require('sinon')
var StaticObservable = require('static-observable')
require('sinon-as-promised')

var Executor = require('../src/server/query-executor.js')
var schema = require('./fixtures/graphql-schema.js')

describe('query-executor', function () {
  describe('query-executor unit', function () {
    beforeEach(function () {
      this.mocks = {
        graphql: {
          execute: sinon.stub(),
          parse: sinon.stub(),
          Source: sinon.stub(),
          specifiedRules: ['foo'],
          validate: sinon.stub()
        }
      }
      this.Executor = proxyquire('../src/server/query-executor.js', {
        'graphql': this.mocks.graphql
      })
    })

    describe('statics', function () {
      describe('_parseQuery', function () {
        it('should parse a query', function () {
          var mocks = this.mocks
          var source = {}
          mocks.graphql.Source.returns(source)
          var documentAST = {}
          mocks.graphql.parse.returns(documentAST)
          var query = {}
          var ret = this.Executor._parseQuery(query)
          // assertions
          sinon.assert.calledOnce(mocks.graphql.Source)
          sinon.assert.calledWith(mocks.graphql.Source, query, 'GraphQL request')
          sinon.assert.calledOnce(mocks.graphql.parse)
          sinon.assert.calledWith(mocks.graphql.parse, source)
          expect(ret).to.equal(documentAST)
        })
      })

      describe('_validateAST', function () {
        it('should validate graphql query ast', function () {
          var mocks = this.mocks
          mocks.graphql.validate.returns([]) // no errors
          var schema = {}
          var documentAST = {}
          var validationRules = null
          this.Executor._validateAST(documentAST, {
            schema: schema,
            validationRules: validationRules
          })
          // assertions
          var allValidationRules = mocks.graphql.specifiedRules
          sinon.assert.calledOnce(mocks.graphql.validate)
          sinon.assert.calledWith(mocks.graphql.validate, documentAST, schema, allValidationRules)
        })

        describe('errors', function () {
          it('should throw an error if validation fails', function (done) {
            var mocks = this.mocks
            var errs = [new Error('1'), new Error('2')]
            mocks.graphql.validate.returns(errs)
            var schema = {}
            var documentAST = {}
            var validationRules = ['bar']
            try {
              this.Executor._validateAST(documentAST, {
                schema: schema,
                validationRules: validationRules
              })
              done(new Error('validation should fail'))
            } catch (err) {
              // assertions
              var allValidationRules = mocks.graphql.specifiedRules.concat(validationRules)
              sinon.assert.calledOnce(mocks.graphql.validate)
              sinon.assert.calledWith(mocks.graphql.validate, documentAST, schema, allValidationRules)
              expect(err.message).to.match(/validation/)
              expect(err.errors).to.equal(errs)
              done()
            }
          })
        })
      })
    })

    describe('methods', function () {
      beforeEach(function () {
        this.spark = {}
        this.context = {}
        this.rootValue = {}
        this.opts = {
          schema: {},
          validationRules: ['bar'],
          context: sinon.stub().returns(this.context),
          rootValue: this.rootValue
        }
        this.primusOpts = { key: 'key' }
        this.executor = new this.Executor(this.spark, this.opts, this.primusOpts)
      })

      describe('execute', function () {
        beforeEach(function () {
          sinon.stub(this.Executor, '_parseQuery')
          sinon.stub(this.Executor, '_validateAST')
          sinon.spy(this.Executor, '_resolveOpt')
        })
        afterEach(function () {
          this.Executor._parseQuery.restore()
          this.Executor._validateAST.restore()
          this.Executor._resolveOpt.restore()
        })

        it('should execute the graphql payload', function () {
          var Executor = this.Executor
          var mocks = this.mocks
          var payload = {
            query: 'query',
            variables: {},
            operationName: 'operationName'
          }
          var opts = this.opts
          var context = this.context
          var rootValue = this.rootValue
          // stubs
          var documentAST = {}
          Executor._parseQuery.returns(documentAST)
          var result = {}
          mocks.graphql.execute.resolves(result)
          // execute
          return this.executor.execute(payload).then(function (result) {
            sinon.assert.calledOnce(Executor._parseQuery)
            sinon.assert.calledWith(Executor._parseQuery, payload.query)
            sinon.assert.calledOnce(Executor._validateAST)
            sinon.assert.calledWith(Executor._validateAST,
              documentAST, opts)
            sinon.assert.calledOnce(mocks.graphql.execute)
            sinon.assert.calledWith(mocks.graphql.execute,
              opts.schema, documentAST, rootValue, context, payload.variables)
          })
        })

        describe('error', function () {
          beforeEach(function () {
            this.parseErr = new Error('boom')
            this.Executor._parseQuery.throws(this.parseErr)
          })
          it('should catch errors and promise.reject them', function (done) {
            var self = this
            var spark = {}
            var payload = {}
            var opts = {}
            this.executor.execute(spark, payload, opts).then(function () {
              done(new Error('should have errored...'))
            }).catch(function (err) {
              expect(err).to.equal(self.parseErr)
              done()
            })
          })
        })
      })
    })
  })

  describe('query-executor functional', function () {
    beforeEach(function () {
      this.Executor = Executor
      this.spark = {}
      this.context = {}
      this.rootValue = {}
      this.opts = {
        schema: schema,
        validationRules: [],
        context: sinon.stub().returns(this.context),
        rootValue: this.rootValue
      }
      this.primusOpts = { key: 'key' }
      this.executor = new this.Executor(this.spark, this.opts, this.primusOpts)
    })

    describe('observe', function () {
      beforeEach(function () {
        var query = [
          'subscription userSubscription ($input: UserChangesInput!) {',
          '  userChanges (input: $input) {',
          '    user {',
          '      name',
          '    }',
          '  }',
          '}'
        ].join('\n')
        this.payload = {
          query: query,
          variables: {
            input_0: {
              id: 0
            }
          }
        }
      })

      it('should invoke schema "observe" method', function (done) {
        var safeDone = once(done)
        var observable = this.executor.observe(this.payload)
        expect(observable).to.exist()
        expect(observable.subscribe).to.exist()
        // make sure it is not StaticObservable.error()..
        observable.subscribe(
          noop,
          function (err) {
            err.errors
              ? safeDone(err.errors[0])
              : safeDone(err)
          },
          noop)
        setTimeout(safeDone, 100)
      })

      describe('errors', function () {
        beforeEach(function () {
          this.payload.query = this.payload.query.replace(/userChanges/, 'invalidSubscription')
          this.payload.query = this.payload.query.replace(/UserChanges/, 'InvalidSubscription')
          console.log(this.payload.query)
        })

        it('should invoke schema "observe" method', function (done) {
          var self = this
          var observable = this.executor.observe(this.payload)
          // make sure it is not StaticObservable.error()..
          expect(observable).to.be.an.instanceOf(StaticObservable)
          observable.subscribe(noop, onError, noop)
          function onError (err) {
            expect(err.message).to.equal('subscription validation error')
            expect(err.errors[0].message).to.equal('"invalidSubscription" observe not implemented in schema')
            done()
          }
        })
      })
    })
  })
})
