var describe = global.describe
var it = global.it
var beforeEach = global.beforeEach
var afterEach = global.afterEach

var callbackCount = require('callback-count')
var expect = require('code').expect
var once = require('once')
var noop = require('101/noop')
var pluck = require('101/pluck')
var proxyquire = require('proxyquire')
var put = require('101/put')
var sinon = require('sinon')
require('sinon-as-promised')

var db = require('./fixtures/mem-db.js')
var Executor = require('../src/server/query-executor.js')
var schema = require('./fixtures/graphql-schema.js')

var expectNotCalled = function (name, done) {
  return function () {
    done(new Error('expected "' + name + '" not to be called'))
  }
}

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
      describe('parseQuery', function () {
        it('should parse a query', function () {
          var mocks = this.mocks
          var source = {}
          mocks.graphql.Source.returns(source)
          var documentAST = {}
          mocks.graphql.parse.returns(documentAST)
          var query = {}
          var ret = this.Executor.parseQuery(query)
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
          sinon.stub(this.Executor, 'parseQuery')
          sinon.stub(this.Executor, '_validateAST')
          sinon.spy(this.Executor, '_resolveOpt')
        })
        afterEach(function () {
          this.Executor.parseQuery.restore()
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
          Executor.parseQuery.returns(documentAST)
          var result = {}
          mocks.graphql.execute.resolves(result)
          // execute
          return this.executor.execute(payload).then(function (result) {
            sinon.assert.calledOnce(Executor.parseQuery)
            sinon.assert.calledWith(Executor.parseQuery, payload.query)
            sinon.assert.calledOnce(Executor._validateAST)
            sinon.assert.calledWith(Executor._validateAST,
              documentAST, opts)
            sinon.assert.calledOnce(mocks.graphql.execute)
            sinon.assert.calledWith(mocks.graphql.execute,
              opts.schema, documentAST, rootValue, context, payload.variables)
          })
        })

        describe('graphql error', function () {
          beforeEach(function () {
            this.parseErr = new Error('boom')
            this.Executor.parseQuery.throws(this.parseErr)
          })

          it('should catch errors and promise.reject them', function (done) {
            var self = this
            var payload = {}
            this.executor.execute(payload).then(function () {
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
          '      id',
          '      name',
          '      idAndName',
          '    }',
          '  }',
          '}'
        ].join('\n')
        this.payload = {
          query: query,
          variables: {
            input: {
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

      describe('promised observable', function () {
        beforeEach(function () {
          this.payload.query = this.payload.query.replace(/userChanges/, 'userChangesPromise')
          this.payload.query = this.payload.query.replace(/UserChangesInput/, 'UserChangesPromiseInput')
        })

        it('should handle promises returned by observe', function (done) {
          var safeDone = once(done)
          var observable = this.executor.observe(this.payload)
          expect(observable).to.exist()
          expect(observable.subscribe).to.exist()
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

        it('should map nexts to graphql-resolve', function (done) {
          var safeDone = once(done)
          var observable = this.executor.observe(this.payload)
          expect(observable).to.exist()
          expect(observable.subscribe).to.exist()
          var countNext = callbackCount(3, assertAndDone).next
          observable.subscribe(
            function (next) {
              countNext(null, next)
            },
            function (err) {
              err.errors
                ? safeDone(err.errors[0])
                : safeDone(err)
            },
            noop)
          // emulate user change db event
          var userId = this.payload.variables.input.id + '' // string
          var changes = [
            {
              id: userId,
              name: 'newName1'
            },
            {
              id: userId,
              name: 'newName2'
            },
            {
              id: userId,
              name: 'newName3'
            }
          ]
          setTimeout(function () {
            changes.forEach(function (change) {
              db.ee.emit('users:' + userId, change)
            })
          }, 10)
          function assertAndDone (err, results) {
            if (err) { return done(err) }
            expect(results.map(pluck('[0]'))).to.deep.equal(changes.map(function (change) {
              return {
                userChangesPromise: {
                  user: put(change, 'idAndName', change.id + ':' + change.name)
                }
              }
            }), { prototype: false })
            done()
          }
        })
      })

      describe('errors', function () {
        describe('no "observe" method', function () {
          beforeEach(function () {
            this.payload.query = this.payload.query.replace(/userChanges/, 'invalidSubscription')
            this.payload.query = this.payload.query.replace(/UserChangesInput/, 'InvalidSubscriptionInput')
          })

          it('should throw error if subscription does not have "observe"', function (done) {
            var observable = this.executor.observe(this.payload)
            observable.subscribe(noop, onError, noop)
            function onError (err) {
              try {
                expect(err.message).to.equal('"invalidSubscription" does not have an observe function')
              } catch (err) {
                return done(err)
              }
              done()
            }
          })
        })

        describe('graphql runtime error', function () {
          beforeEach(function () {
            this.err = new Error('boom')
            sinon.stub(this.Executor, 'parseQuery').throws(this.err)
          })
          afterEach(function () {
            this.Executor.parseQuery.restore()
          })

          it('should be caught and errored through observable', function (done) {
            var self = this
            var observable = this.executor.observe(this.payload)
            observable.subscribe(noop, onError, noop)
            function onError (err) {
              try {
                expect(err).to.equal(self.err)
              } catch (err) {
                return done(err)
              }
              done()
            }
          })
        })

        describe('schema "observe" runtime error', function () {
          beforeEach(function () {
            this.payload.query = this.payload.query.replace(/userChanges/, 'observeThrows')
            this.payload.query = this.payload.query.replace(/UserChangesInput/, 'ObserveThrowsInput')
          })

          it('should catch runtime errors w/in "observe" method', function (done) {
            var observable = this.executor.observe(this.payload)
            expect(observable).to.exist()
            expect(observable.subscribe).to.exist()
            observable.subscribe(
              expectNotCalled('onNext', done),
              function (err) {
                try {
                  expect(err).to.exist()
                  expect(err.message).to.equal('observe error')
                  done()
                } catch (err) {
                  done(err)
                }
              },
              expectNotCalled('onCompleted', done))
          })
        })

        describe('multiple errors', function () {
          beforeEach(function () {
            this.errors = [new Error('boom1'), new Error('boom2')]
            this.mocks = {
              graphqlObserve: sinon.stub().resolves({
                errors: this.errors
              })
            }
            this.Executor = proxyquire('../src/server/query-executor.js', {
              './graphql-observe.js': this.mocks.graphqlObserve
            })
            this.executor = new this.Executor(this.spark, this.opts, this.primusOpts)
          })

          it('should handle multiple payload errors', function (done) {
            var self = this
            var observable = this.executor.observe(this.payload)
            sinon.assert.calledOnce(this.mocks.graphqlObserve)
            observable.subscribe(noop, onError, noop)
            function onError (err) {
              try {
                expect(err.message).to.equal('multiple errors')
                expect(err.errors).to.equal(self.errors)
              } catch (err) {
                return done(err)
              }
              done()
            }
          })
        })
      })
    })
  })
})
