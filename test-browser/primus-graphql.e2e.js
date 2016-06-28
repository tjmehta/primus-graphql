require('babel-polyfill')

var before = global.before
var describe = global.describe
var it = global.it
var Primus = global.Primus

var url = require('url')

var assign = require('101/assign')
var expect = require('chai').expect
var omit = require('101/omit')
var Relay = require('react-relay')
var render = require('react-dom').render
var shimmer = require('shimmer')

var RootContainer = require('./fixtures/root-container.jsx')
var UserComponent = require('./fixtures/user-container.jsx').UserComponent
var PrimusRelayNetworkLayer = require('../lib/relay-network-layer.js')

var parseErr = function (json) {
  var err = new Error(json.message)
  assign(err, json)
  return err
}
var primusUrl = url.format({
  protocol: 'http:',
  host: 'localhost:' + 9876,
  pathname: 'primus'
})

describe('E2E browser tests', function () {
  describe('client tests', function () {
    it('should connect', function (done) {
      var client = new Primus(primusUrl)
      client.end()
      done()
    })

    it('should allow a graphql query', function () {
      var client = new Primus(primusUrl)
      var query = 'query { user { id, name } }'
      return client.graphql(query).then(function (data) {
        if (data.errors) {
          throw data.errors.map(parseErr)[0]
        }
        expect(data.data.user).to.deep.equal({ id: '1', name: 'name' })
      })
    })
  })

  describe('relay tests', function () {
    before(function () {
      this.client = new Primus(primusUrl)
      Relay.injectNetworkLayer(
        new PrimusRelayNetworkLayer(this.client)
      )
    })

    it('should work', function (done) {
      var reactDiv = document.createElement('div')
      reactDiv.id = 'react-div'
      document.body.appendChild(reactDiv)
      shimmer.wrap(UserComponent.prototype, 'render', function (orig) {
        return function () {
          expect(omit(this.props.user, '__dataID__')).to.deep.equal({
            id: '1',
            name: 'name'
          })
          done()
          return orig.apply(this, arguments)
        }
      })
      render(RootContainer, reactDiv)
    })
  })
})
