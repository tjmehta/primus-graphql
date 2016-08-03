require('babel-polyfill')

var afterEach = global.afterEach
var before = global.before
var beforeEach = global.beforeEach
var describe = global.describe
var it = global.it
var Primus = global.Primus

var url = require('url')

var expect = require('chai').expect
var filter = require('object-loops/filter')
var Relay = require('react-relay')
var render = require('react-dom').render
var shimmer = require('shimmer')
var uuid = require('uuid')

var RootContainer = require('./fixtures/root-container.jsx')
var UpdateMeMutation = require('./fixtures/queries/update-me-mutation.js')
var UserComponent = require('./fixtures/user-container.jsx').UserComponent
var UserSubscription = require('./fixtures/queries/user-subscription.js')
var PrimusRelayNetworkLayer = require('../relay-network-layer.js')

var primusUrl = url.format({
  protocol: 'http:',
  host: 'localhost:' + 9876,
  pathname: 'primus'
})

window.localStorage.debug = 'primus-graphql:*'

describe('E2E browser tests', function () {
  describe('required primus', function () {
    describe('client tests', function () {
      it('should connect', function (done) {
        var client = new Primus(primusUrl)
        client.end()
        done()
      })

      it('should allow a graphql query', function () {
        var client = new Primus(primusUrl)
        var query = 'query { me { id, name } }'
        return client.graphql(query).then(function (data) {
          if (data.errors) {
            throw data.errors[0]
          }
          expect(data.data.me).to.deep.equal({ id: '0', name: 'name0' })
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
      beforeEach(function () {
        this.reactDiv = document.createElement('div')
        this.reactDiv.id = 'react-div'
        document.body.appendChild(this.reactDiv)
      })
      afterEach(function () {
        shimmer.unwrap(UserComponent.prototype, 'render')
        document.body.removeChild(this.reactDiv)
        if (this.disposable) {
          this.disposable.dispose()
          delete this.disposable
        }
      })

      it('should query all data needed for views', function (done) {
        var reactDiv = this.reactDiv
        render(RootContainer, reactDiv)
        shimmer.wrap(UserComponent.prototype, 'render', function (orig) {
          return function () {
            var cleanProps = filter(this.props.me, function (val, key) {
              return /^[^_]/.test(key)
            })
            expect(cleanProps).to.deep.equal({
              id: '0',
              name: 'name0'
            })
            done()
            return orig.apply(this, arguments)
          }
        })
        render(RootContainer, reactDiv)
      })

      it('should mutate and receive updates for views', function (done) {
        var newName = uuid()
        // wrap render to watch for changes
        var firstRender = true
        shimmer.wrap(UserComponent.prototype, 'render', function (orig) {
          return function () {
            if (firstRender) {
              firstRender = false
              handleFirstRender(this)
            } else {
              shimmer.unwrap(UserComponent.prototype, 'render')
              handleSecondRender(this)
            }
            return orig.apply(this, arguments)
          }
        })
        // initial render
        var reactDiv = this.reactDiv
        render(RootContainer, reactDiv)
        // first render: send mutation
        function handleFirstRender (userComponent) {
          var mutation = new UpdateMeMutation({
            me: userComponent.props.me,
            input: {
              name: newName
            }
          })
          userComponent.props.relay.commitUpdate(mutation)
        }
        // second render: assertions
        function handleSecondRender (userComponent) {
          expect(userComponent.props.me.name).to.equal(newName)
          done()
        }
      })

      it('should subscribe and receive updates for views', function (done) {
        var self = this
        var newName = uuid()
        // wrap render to watch for changes
        var firstRender = true
        shimmer.wrap(UserComponent.prototype, 'render', function (orig) {
          return function () {
            if (firstRender) {
              firstRender = false
              handleFirstRender(this)
            } else {
              shimmer.unwrap(UserComponent.prototype, 'render')
              handleSecondRender(this)
            }
            return orig.apply(this, arguments)
          }
        })
        // initial render
        var reactDiv = this.reactDiv
        render(RootContainer, reactDiv)
        // first render: send mutation
        function handleFirstRender (userComponent) {
          // subscribe
          var subscription = new UserSubscription(userComponent.props)
          self.disposable = userComponent.props.relay.subscribe(subscription)
          // mutate
          var mutation = new UpdateMeMutation({
            me: userComponent.props.me,
            input: {
              name: newName,
              old: true // force old response
            }
          })
          userComponent.props.relay.commitUpdate(mutation)
        }
        // second render: assertions
        function handleSecondRender (userComponent) {
          expect(userComponent.props.me.name).to.equal(newName)
          done()
        }
      })

      it('should keep subscriptions up-to-date through reconnections', function (done) {
        var self = this
        var newName = uuid()
        // wrap render to watch for changes
        var firstRender = true
        shimmer.wrap(UserComponent.prototype, 'render', function (orig) {
          return function () {
            if (firstRender) {
              firstRender = false
              handleFirstRender(this)
            } else {
              shimmer.unwrap(UserComponent.prototype, 'render')
              handleSecondRender(this)
            }
            return orig.apply(this, arguments)
          }
        })
        // initial render
        var reactDiv = this.reactDiv
        render(RootContainer, reactDiv)
        // first render: send mutation
        function handleFirstRender (userComponent) {
          // mutate BEFORE subscription to emulate missed mutation
          var mutation = new UpdateMeMutation({
            me: userComponent.props.me,
            input: {
              name: newName,
              old: true // force old response
            }
          })
          // hack: make sure mutation does not update props
          mutation.getConfigs = function () {
            return []
          }
          userComponent.props.relay.commitUpdate(mutation)
          // force primus reconnect
          self.client.recovery.reset().reconnect()
          self.client.on('reconnect', function () {
            // subscribe AFTER mutation to emulate missed data due to disconnect
            var subscription = new UserSubscription(userComponent.props)
            self.disposable = userComponent.props.relay.subscribe(subscription)
          })
        }
        // second render: assertions
        function handleSecondRender (userComponent) {
          expect(userComponent.props.me.name).to.equal(newName)
          done()
        }
      })
    })
  })
})
