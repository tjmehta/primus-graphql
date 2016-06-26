// var EventEmitter = require('events').EventEmitter

// var expect = require('code').expect
// var proxyquire = require('proxyquire')
// var sinon = require('sinon')

// var describe = global.describe
// var it = global.it
// var beforeEach = global.beforeEach
// var afterEach = global.afterEach

// var createServerPlugin = require('../src/primus-graphql.server.js')
// var defaultOpts = require('../src/default-opts.js')
// var schema = require('./fixtures/graphql-schema.js')

// describe('primus-graphql server', function () {
//   beforeEach(function () {
//     global.primus = new EventEmitter()
//   })
//   afterEach(function () {
//     delete global.primus
//   })

//   describe('createServerPlugin()', function () {
//     it('should create server plugin', function () {
//       var plugin = createServerPlugin()
//       expect(plugin).to.exist()
//       expect(plugin).to.be.a.function()
//     })
//   })

//   describe('serverPlugin', function () {
//     beforeEach(function () {
//       this.graphqlMock = {
//         execute: sinon.stub(),
//         parse: sinon.stub(),
//         specifiedRules: [],
//         validate: sinon.stub()
//       }
//       this.plugin = createServerPlugin()
//       this.MockPrimus = {}
//       this.MockSpark = function () {}
//       this.MockSpark.prototype = new EventEmitter()
//       this.MockPrimus.Spark = this.MockSpark
//     })

//     it('should extend Spark', function () {
//       this.plugin(this.MockPrimus)
//       expect(this.MockSpark.prototype.graphql).to.exist()
//       expect(this.MockSpark.prototype.graphql).to.be.a.function()
//     })

//     describe('spark.graphql()', function () {
//       beforeEach(function () {
//         this.plugin(this.MockPrimus)
//         this.spark = new this.MockSpark()
//       })

//       it('should ignore non-graphql data', function () {
//         var spark = this.spark
//         spark.graphql()
//         var handlers = spark.listeners('data')
//         var handler = handlers[0] = sinon.stub()
//         spark.emit('data', {})
//         sinon.assert.notCalled(handler)
//       })

//       it('should handle graphql data', function (done) {
//         var spark = this.spark
//         spark.graphql()
//         var data = {}
//         data[defaultOpts.key] = {
//           id: 1,
//           query: 'query',
//           variables: {}
//         }
//         spark.emit('data', data)

//       })
//     })
//   })
// })