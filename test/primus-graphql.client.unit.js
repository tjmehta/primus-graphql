var EventEmitter = require('events').EventEmitter

var expect = require('code').expect
var proxyquire = require('proxyquire')
var sinon = require('sinon')

var describe = global.describe
var it = global.it
var beforeEach = global.beforeEach
var afterEach = global.afterEach

var createClientPlugin = require('../lib/primus-graphql.client.js')
var defaultOpts = require('../lib/default-opts.js')
console.log(defaultOpts, 'defaultOpts')

describe('primus-graphql client', function () {
  beforeEach(function () {
    global.primus = new EventEmitter()
  })
  afterEach(function () {
    delete global.primus
  })

  describe('createClientPlugin()', function () {
    it('should extend primus', function () {
      createClientPlugin()
      expect(primus.graphql).to.exist()
      expect(primus.graphql).to.be.a.function()
    })
  })

  describe('primus.graphql(...)', function () {
    beforeEach(function () {
      this.uuid = 1
      this.uuidMock = sinon.stub().returns(this.uuid)
      var createClientPlugin = proxyquire('../lib/primus-graphql.client.js', {
        uuid: this.uuidMock
      })
      createClientPlugin()
      primus.write = sinon.stub()
    })

    it('should send a graphql payload (promise)', function () {
      var query = 'query'
      var vars = { foo: 1 }
      primus.graphql(query, vars)
      sinon.assert.calledOnce(primus.write)
      var expected = {}
      expected[defaultOpts.key] = {
        id: this.uuid,
        query: query,
        variables: vars
      }
      sinon.assert.calledWith(primus.write, expected)
    })

    describe('response', function() {
      it('should receive a graphql payload response (promise)', function () {
        var query = 'query'
        var vars = { foo: 1 }
        var promise = primus.graphql(query, vars)
        var res = {}
        res[defaultOpts.key] = {
          id: this.uuid,
          data: {},
          statusCode: 200
        }
        primus.emit('data', res)
        return promise.then(function (payload) {
          expect(payload).to.deep.equal(res[defaultOpts.key])
        })
      })

      it('should receive a graphql payload response (promise)', function (done) {
        var query = 'query'
        var vars = { foo: 1 }
        var res = {}
        res[defaultOpts.key] = {
          id: this.uuid,
          data: {},
          statusCode: 200
        }
        var promise = primus.graphql(query, vars, function (err, payload) {
          if (err) { return done(err) }
          expect(payload).to.deep.equal(res[defaultOpts.key])
          done()
        })
        primus.emit('data', res)
      })
    })
  })
})