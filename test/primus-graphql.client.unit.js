var EventEmitter = require('events').EventEmitter

var expect = require('code').expect
var proxyquire = require('proxyquire')
var sinon = require('sinon')

var describe = global.describe
var it = global.it
var beforeEach = global.beforeEach
var afterEach = global.afterEach

var defaultOpts = require('../src/default-opts.js')

var id = 0

describe('primus-graphql client', function () {
  beforeEach(function () {
    global.primus = this.primus = new EventEmitter()
    sinon.spy(this.primus, 'on')
    global.primusOpts = null
  })
  afterEach(function () {
    delete global.primus
    delete global.primusOpts
  })

  describe('clientPlugin()', function () {
    it('should extend primus', function () {
      proxyquire('../src/primus-graphql.client.js', {})
      expect(this.primus.graphql).to.exist()
      expect(this.primus.graphql).to.be.a.function()
    })
  })

  describe('primus.graphql(...)', function () {
    beforeEach(function () {
      var self = this
      this.subscriptionObservable = {}
      this.mocks = {
        events: {
          EventEmitter: function () {
            var ee = self.resEE = new EventEmitter()
            sinon.spy(ee, 'emit')
            sinon.spy(ee, 'on')
            return ee
          }
        },
        SubscriptionObservable: sinon.stub().returns(this.subscriptionObservable)
      }
      this.uuid = id++
      proxyquire('../src/primus-graphql.client.js', {
        events: this.mocks.events,
        './client/subscription-observable.js': this.mocks.SubscriptionObservable,
        uuid: sinon.stub().returns(this.uuid)
      })
      sinon.spy(this.primus, '_observeGraphQL')
      this.primus.write = sinon.stub().returns(true)
    })
    afterEach(function () {
      this.primus._observeGraphQL.restore()
    })

    describe('write error', function () {
      beforeEach(function () {
        this.primus.write.returns(false)
      })

      it('should send a graphql payload (promise)', function (done) {
        var key = defaultOpts.key
        var query = 'query ...'
        return this.primus.graphql(query, function (err) {
          expect(err).to.exist()
          expect(err.message).to.match(/write/)
          sinon.assert.calledOnce(this.primus.write)
          var expected = {}
          expected[key] = {
            query: query
          }
          var actual = this.primus.write.args[0][0]
          expect(actual[key].id).to.match(/^[a-z0-9-]+$/)
          expect(actual[key].query).to.equal(expected[key].query)
          done()
        })
      })
    })

    describe('write success', function () {
      beforeEach(function () {
        this.primus.write.returns(true)
      })

      it('should send a graphql query/mutation payload (promise)', function () {
        var key = defaultOpts.key
        var query = 'query ...'
        var vars = { foo: 1 }
        this.primus.graphql(query, vars)
        sinon.assert.calledOnce(this.primus.write)
        var expected = {}
        expected[key] = {
          query: query,
          variables: vars
        }
        var actual = this.primus.write.args[0][0]
        expect(actual[key].id).to.match(/^[a-z0-9-]+$/)
        expect(actual[key].query).to.equal(expected[key].query)
        expect(actual[key].variables).to.equal(expected[key].variables)
      })

      it('should create return an observable graphql for subscription payload', function () {
        var key = defaultOpts.key
        var query = 'subscription ...'
        var vars = { foo: 1 }
        var observable = this.primus.graphql(query, vars)
        var expected = {}
        expected[key] = {
          id: this.uuid,
          query: query,
          variables: vars,
          operationName: undefined
        }
        expect(observable).to.equal(this.subscriptionObservable)
        sinon.assert.calledOnce(this.primus._observeGraphQL)
        sinon.assert.calledWith(this.primus._observeGraphQL, expected)
        sinon.assert.calledOnce(this.mocks.SubscriptionObservable)
        sinon.assert.calledWith(this.mocks.SubscriptionObservable, this.primus, this.resEE, expected, defaultOpts)
      })

      describe('response', function () {
        it('should receive a graphql payload response (promise)', function () {
          var query = 'query ...'
          var vars = { foo: 1 }
          var promise = this.primus.graphql(query, vars)
          var uuid = this.primus.write.args[0][0][defaultOpts.key].id
          var res = {}
          res[defaultOpts.key] = {
            id: uuid,
            data: {},
            statusCode: 200
          }
          this.primus.emit('data', res)
          sinon.assert.calledOnce(this.resEE.emit)
          return promise.then(function (payload) {
            expect(payload).to.deep.equal(res[defaultOpts.key])
          })
        })

        it('should receive a graphql payload response (callback)', function (done) {
          var query = 'mutation ...'
          var vars = { foo: 1 }
          var files = []
          var res = {}
          this.primus.graphql(query, vars, files, function (err, payload) {
            if (err) { return done(err) }
            expect(payload).to.deep.equal(res[defaultOpts.key])
            done()
          })
          var uuid = this.primus.write.args[0][0][defaultOpts.key].id
          res[defaultOpts.key] = {
            id: uuid,
            data: {},
            statusCode: 200
          }
          this.primus.emit('data', res)
        })

        it('should receive a graphql payload response (error)', function (done) {
          var query = 'mutation ...'
          var vars = { foo: 1 }
          var files = []
          var res = {}
          this.primus.graphql(query, vars, files, function (err, payload) {
            if (err) { return done(err) }
            expect(payload).to.deep.equal(res[defaultOpts.key])
            expect(payload.errors[0]).to.be.an.instanceOf(Error)
            done()
          })
          var uuid = this.primus.write.args[0][0][defaultOpts.key].id
          res[defaultOpts.key] = {
            id: uuid,
            errors: [{
              message: 'message'
            }],
            statusCode: 400
          }
          this.primus.emit('data', res)
        })

        describe('two', function () {
          it('should not attach handler twice', function () {
            var query = 'query ...'
            var vars = { foo: 1 }
            var key = defaultOpts.key
            // res
            var promise = this.primus.graphql(query, vars)
            var uuid = this.primus.write.args[0][0][key].id
            var res = {}
            res[key] = {
              id: uuid,
              data: {},
              statusCode: 200
            }
            this.primus.emit('data', res)
            // res2
            var promise2 = this.primus.graphql(query, vars)
            var uuid2 = this.primus.write.args[1][0][key].id
            var res2 = {}
            res2[key] = {
              id: uuid2,
              data: {},
              statusCode: 200
            }
            this.primus.emit('data', res2)
            // sinon.assert.calledTwice(this.resEE.emit)
            sinon.assert.calledOnce(this.primus.on)
            return Promise.all([
              promise.then(function (payload) {
                expect(payload).to.deep.equal(res[key])
              }),
              promise2.then(function (payload) {
                expect(payload).to.deep.equal(res2[key])
              })
            ])
          })
        })

        describe('non-graphql payload', function () {
          beforeEach(function () {
            var query = 'query ...'
            var vars = { foo: 1 }
            this.primus.graphql(query, vars, function () {
              throw new Error('should not happen')
            })
          })

          it('should ignore', function () {
            var res = {}
            res['non-graphql-data'] = {
              id: 'foo'
            }
            this.primus.emit('data', res)
            sinon.assert.notCalled(this.resEE.emit)
          })
        })
      })
    })
  })
})
