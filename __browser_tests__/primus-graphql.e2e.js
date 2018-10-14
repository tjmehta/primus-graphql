var afterEach = global.afterEach
var before = global.before
var beforeEach = global.beforeEach
var describe = global.describe
var it = global.it
var Primus = global.Primus

var url = require('url')

var expect = require('chai').expect
var render = require('react-dom').render
var shimmer = require('shimmer')
var uuid = require('uuid')

var getRootContainer = require('./fixtures/relay-app/getRootContainer.js')
var updateUserMutation = require('./fixtures/relay-app/UpdateUserMutation.js')
var UserComponent = require('./fixtures/relay-app/UserContainer.js').UserComponent
var subscribeToUserSubscription = require('./fixtures/relay-app/UserSubscription.js')

var primusUrl = url.format({
  protocol: 'http:',
  host: 'localhost:' + 9876,
  pathname: 'primus'
})

var createUser = function (name) {
  var client = new Primus(primusUrl)
  var query = 'mutation CreateUser ($input: CreateUserInput!) { createUser(input: $input) { user { id, name } } }'

  var vars = {
    input: {
      name: name
    }
  }
  return client.graphql(query, vars)
}

window.localStorage.debug = 'primus-graphql:*'

// these browser tests are pretty messy, but they are great for validating everything is working

describe('E2E browser tests', function () {
  describe('required primus', function () {
    describe('client tests', function () {
      it('should connect', function (done) {
        var client = new Primus(primusUrl)
        client.end()
        done()
      })

      it('should allow a graphql query', function () {
        var name = 'create user name'
        return createUser(name).then(function (data) {
          if (data.errors) {
            throw data.errors[0]
          }
          expect(data.data.createUser.user).to.deep.contain({ name: name })
        })
      })
    })

    describe('relay tests', function () {
      before(function () {
        this.client = new Primus(primusUrl)
      })
      beforeEach(function () {
        this.reactDiv = document.createElement('div')
        this.reactDiv.id = 'react-div'
        document.body.appendChild(this.reactDiv)
        // create user
        var self = this
        return createUser('name').then(function (result) {
          if (result.errors) throw new Error(result.errors[0])
          self.user = result.data.createUser.user
        })
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
        const self = this
        shimmer.wrap(UserComponent.prototype, 'render', function (orig) {
          return function () {
            expect(this.props.user.name).to.deep.equal(self.user.name)
            setTimeout(function () { done() }, 0)
            return orig.apply(this, arguments)
          }
        })
        render(getRootContainer(this.client, this.user.id), this.reactDiv)
      })

      it('should mutate and receive updates for views', function (done) {
        var self = this
        var newName = uuid()
        // wrap render to watch for changes
        var firstRender = true
        shimmer.wrap(UserComponent.prototype, 'render', function (orig) {
          return function () {
            // console.log('RENDER')
            if (firstRender) {
              firstRender = false
              handleFirstRender(this)
            } else {
              handleSecondRender(this)
            }
            return orig.apply(this, arguments)
          }
        })
        // initial render
        render(getRootContainer(this.client, this.user.id), this.reactDiv)
        // first render: send mutation
        function handleFirstRender (userComponent) {
          updateUserMutation(self.user.id, newName)
        }
        // second render: post mutation assertions
        function handleSecondRender (userComponent) {
          expect(userComponent.props.user.name).to.equal(newName)
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
            // console.log('RENDER')
            if (firstRender) {
              firstRender = false
              handleFirstRender(this)
            } else {
              handleSecondRender(this)
            }
            return orig.apply(this, arguments)
          }
        })
        // initial render
        render(getRootContainer(this.client, this.user.id), this.reactDiv)
        // first render: subscribe to user changes, send mutation
        function handleFirstRender (userComponent) {
          self.disposable = subscribeToUserSubscription(self.user.id)
          updateUserMutation(self.user.id, newName, true /* dont update environment */)
        }
        // second render: rerender due to subscription
        function handleSecondRender (userComponent) {
          expect(userComponent.props.user.name).to.equal(newName)
          done()
        }
      })

      it('should keep subscriptions subscribed through reconnections', function (done) {
        var self = this
        var newName = uuid()
        // wrap render to watch for changes
        var firstRender = true
        shimmer.wrap(UserComponent.prototype, 'render', function (orig) {
          return function () {
            // console.log('RENDER')
            if (firstRender) {
              firstRender = false
              handleFirstRender(this)
            } else {
              handleSecondRender(this)
            }
            return orig.apply(this, arguments)
          }
        })
        // initial render
        render(getRootContainer(this.client, this.user.id), this.reactDiv)
        // first render: subscribe to user changes, send mutation
        function handleFirstRender (userComponent) {
          self.disposable = subscribeToUserSubscription(self.user.id)
          self.client.recovery.reset().reconnect()
          updateUserMutation(self.user.id, newName, true /* done update environment */)
          self.client.on('reconnect', function () {
            console.log('subscribe')
          })
        }
        // second render: rerender due to subscription
        function handleSecondRender (userComponent) {
          expect(userComponent.props.user.name).to.equal(newName)
          done()
        }
      })
    })
  })
})
