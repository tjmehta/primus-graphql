# primus-graphql [![Build Status](https://travis-ci.org/tjmehta/primus-graphql.svg?branch=master)](https://travis-ci.org/tjmehta/primus-graphql) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)
Primus server/client plugin for GraphQL and Relay

# Installation
```bash
npm i --save primus-graphql
npm i --save rxjs # peer dependency (server/client)
npm i --save graphql # peer dependency (server)
npm i --save react-relay # optional peer dependency (if using relay in client)
```

# Usage
### GraphQL Example
Client Example:
```js
var client = new Primus()
var query = 'query { user { id, name } }'
// promise api
client.graphql(query).then(function (data) {
  if (data.errors) {
    console.error(data.errors)
    return
  }
  console.log(data)
  /* see hardcoded server example below
    {
      data: {
        user: {
          id: 1,
          name: 'name'
        }
      }
    }
   */
})
// callback api
client.graphql(query, function (err, data) {
  if (err) {
    console.error(err)
    return
  }
  if (data.errors) {
    console.error(data.errors)
    return
  }
  console.log(data)
  /* see hardcoded server example below
    {
      data: {
        user: {
          id: 1,
          name: 'name'
        }
      }
    }
   */
})
```
Server Example:
```js
var GraphQL = require('graphql')
var primus = require('primus')
var primusGraphQL = require('primus-graphql')

var GraphQLSchema = GraphQL.GraphQLSchema
var GraphQLString = GraphQL.GraphQLString
var GraphQLObjectType = GraphQL.GraphQLObjectType

var UserType = new GraphQLObjectType({
  name: 'User',
  description: 'user',
  fields: {
    id: { type: GraphQLString },
    name: { type: GraphQLString }
  }
})

var Query = new GraphQLObjectType({
  name: 'Query',
  description: 'Root query',
  fields: {
    user: {
      type: UserType,
      args: {},
      resolve: () => {
        return {
          id: 1,
          name: 'name'
        }
      }
    }
  }
})

var schema = new GraphQLSchema({
  query: Query
})

var server = /* your http server */
var primus = new Primus(server, {
  transport: /* transport */,
  parser: 'json'
})

primus.use('graphql', primusGraphQL({
  // `schema` is required
  schema: schema,
  // Optional options
  context: function (spark) {
    return spark
  },
  rootValue: null,
  formatError: function (err) {
    return {
      message: err.message
    }
  },
  validationRules: [/* additional validation rules */]
}))
```

##### Options

The `primusGraphQL` plugin function accepts the following options:

  * **`schema`**: A `GraphQLSchema` instance from [`graphql-js`][].
    A `schema` *must* be provided.

  * **`context`**: Optional. A value to pass as the `context` to the `graphql()`
    function from [`graphql-js`][]. If a function is used it will be invoke w/ `spark`,
    and must return the `context`.

  * **`rootValue`**: Optional. A value to pass as the `rootValue` to the `graphql()`
    function from [`graphql-js`][]. If a function is used it will be invoke w/ `spark`,
    and must return the `rootValue`.

  * **`formatError`**: Optional. An optional function which will be used to format any
    errors produced by fulfilling a GraphQL operation. If no function is
    provided, GraphQL's default spec-compliant [`formatError`][] function will
    be used.

  * **`validationRules`**: Optional. Additional validation rules queries must
    satisfy in addition to those defined by the GraphQL spec.

### Relay Example
```js
var Relay = require('react-relay')
var PrimusRelayNetworkAdapter = require('primus-graphql/relay-network-layer')
var primus = new Primus()


Relay.injectNetworkLayer(
  new PrimusRelayNetworkAdapter(primus, {
    // default options:
    timeout: 15000,
    retry: {
      minTimeout: 1000,
      maxTimeout: 3000,
      factor: 3,
      retries: 2
    }
  })
)
```

### Subscriptions example (alpha support)
Subscriptions currently requires my fork of react-relay. Don't worry, it won't be a fork forever the [PR](https://github.com/facebook/relay/pull/1298) is pending.
To use my fork use this in your package.json `"react-relay": "github:tjmehta/relay#subscriptions-build"`

##### Graphql subscription schema example
* `primus-graphql` exports a graphql subscription factory method via `require('primus-graphql/graphql-relay-subscription')`
* graphql subscription's config requires:
    - `name`, name of the subscription
    - `inputFields`, `input` argument schema, similar to mutations
    - `outputFields`, `output` schema, similar to mutations
    - `observe`, should return an observable which triggers a `onNext` callback upon recieving an update. The `next` value will be used as the `rootValue` to `resolve`. For more info on observables checkout [rxjs](https://github.com/ReactiveX/RxJS).
    - `[resolve]`, the same as other schemas with one difference. `resolve` is called when recieving every `next` value. `resolve` is not required if the `next` value is the output exactly. In the case that `next` data is only a partial-output or `null`, you can use resolve to fetch missing output-data.
* special note about `inputFields`: if the client disconnects and reconnects the client will automatically add a `reconnect` input field w/ a value of `true`. In this case, you can send the fresh data, because it could be out of date.
```js
var relaySubscription = require('primus-graphql/graphql-relay-subscription')

var UserType = new GraphQLObjectType({
  name: 'User',
  description: 'user',
  fields: {
    id: { type: GraphQLString },
    name: { type: GraphQLString }
  }
})

var UserChangesSubscription = relaySubscription({
  name: 'UserChanges',
  inputFields: {
    id: {
      type: new GraphQLNonNull(GraphQLString)
    }
  },
  outputFields: {
    me: {
      type: UserType
    }
  },
  observe: (input, context, info) => {
    var event = 'users:' + input.id
    debug('observe', event, input, input.id)
    return new Observable(function (subscriber) {
      debug('subscribe', event)
      db.ee.on(event, onNext)
      db.ee.on(event + ':error', subscriber.error)
      db.ee.on(event + ':completed', subscriber.complete)
      function onNext (user) {
        subscriber.next({
          me: user
        })
      }
      if (input.reconnect) {
        debug('reconnect', event, input, input.id)
        // re-subscribed due to reconnect
        // emit user immediately, so the frontend has latest data
        db.ee.emit(event, db.users[input.id])
      }
      return new RxSubscription(function () {
        debug('dispose', event, input.id)
        db.ee.removeListener(event, onNext)
        db.ee.removeListener(event + ':error', subscriber.error)
        db.ee.removeListener(event + ':completed', subscriber.complete)
      })
    })
  }
})
```

##### Relay subscription example
* currently requires my fork of relay: `"github:tjmehta/relay#subscriptions-build"`
* The `Relay.Subscription` class is very similar to `Relay.Mutation`, except does not have a "fat query". The query is fully define by subscription query (`getSubscription`).
```js
var Relay = require('react-relay')

class UserSubscription extends Relay.Subscription {
  getCollisionKey () {
    return 'subscribe_' + this.props.me.id
  }
  getConfigs () {
    return [{
      type: 'FIELDS_CHANGE',
      fieldIDs: { user: this.props.me.id }
    }]
  }
  getSubscription () {
    return Relay.QL`
      subscription userSubscription ($input: UserChangesInput!) {
        userChanges (input: $input) {
          user {
            name
          }
        }
      }
    `
  }
  getVariables () {
    return {
      id: this.props.me.id
    }
  }
}
UserSubscription.fragments = {
  me: () => Relay.QL`
    fragment on User {
      id
    }
  `
}
```

##### Using relay subscriptions in a view example
* relay environment has a new method `subscribe` which accepts a relay subscription
    - subscribe takes a subscription, and, optionally, subscription callbacks `{ onNext:..., onError:..., onCompleted, ...}` (second arg, not used in example below).
```js
var React = require('react')
var Relay = require('react-relay')

var UserSubscription = require('./queries/user-subscription.js')

class UserComponent extends React.Component {
  constructor (props) {
    super(props)
    // in this example, we subscribe immediately to an user changes
    var subscription = new Subscription({ me: props.me })
    this.disposable = this.props.relay.subscribe(subscription)
    // disposable allows you to "stop listening" to this subscription
    // by calling `disposable.dispose()`
  }
  render () {
    return <div>
      <div>
        <span>ID:</span>
        {this.props.me.id}
      </div>
      <div>
        <span>NAME:</span>
        {this.props.me.name}
      </div>
    </div>
  }
}

var UserContainer = Relay.createContainer(UserComponent, {
  fragments: {
    me: () => Relay.QL`
      fragment on User {
        id,
        name,
        ${UserSubscription.getFragment('me')}
      }
    `
  }
})

class UserRoute extends Relay.Route {}

UserRoute.queries = {
  me: (Component) => Relay.QL`
    query UserQuery {
      me {
        ${Component.getFragment('me')}
      }
    }
  `
}
UserRoute.routeName = 'User'

var RootContainer = <Relay.RootContainer
  Component={UserContainer}
  route={new UserRoute()}
/>

// render..
```

##### Full subscriptions example
Check out the end-to-end tests here: test-browser/primus-graphql.e2e.js

# Changelog
[CHANGELOG.md](https://github.com/tjmehta/primus-graphql/blob/master/CHANGELOG.md)

# License
MIT
