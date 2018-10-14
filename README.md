# primus-graphql [![Build Status](https://travis-ci.org/tjmehta/primus-graphql.svg?branch=master)](https://travis-ci.org/tjmehta/primus-graphql) [![Coverage Status](https://coveralls.io/repos/github/tjmehta/primus-graphql/badge.svg?branch=master)](https://coveralls.io/github/tjmehta/primus-graphql?branch=master) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)

![primus-graphql-logo](https://i.imgur.com/RDn6XT9.png)

Primus-GraphQL is a flexible client and server library that can be used to power realtime [GraphQL](https://github.com/graphql/graphql-js). It is similar to [Express-GraphQL](https://github.com/graphql/express-graphql) but with support for [Relay](https://github.com/facebook/relay) and Subscriptions!

This module is a Primus plugin. [Primus](https://github.com/primus/primus) is a robust realtime abstraction layer that allows you to use WebSockets, Socket.io, Engine.io, SockJS, or any transport-layer. Primus powers sending and receiving data on both the client and the server. Primus-GraphQL makes it easy to send and handle GraphQL queries, mutations, and subscriptions.


# Installation
```bash
npm i --save primus-graphql
npm i --save rxjs # peer dependency (server/client)
npm i --save graphql # peer dependency (server)
npm i --save relay-runtime # optional peer dependency (if using relay in client)
```

# Usage
### GraphQL Example
Server Example:
```js
import {
  GraphQLSchema,
  GraphQLString,
  GraphQLObjectType,
} from 'graphql'
import primus from 'primus'
import primusGraphQL from 'primus-graphql'

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
Client Example:
```js
const client = new Primus()
const query = 'query { user { id, name } }'
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


##### Server Options

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

### Relay

##### Relay Network Options

The `PrimusRelayNetwork` class accepts the following options:

* **`timeout`**: The max timeout for any graphql query or mutation.
* **`retry`**: Exponential backoff settings for retryable query, mutation, or subscription errors.
* **`retry.maxTimeout`**: The max timeout to wait before retrying.
* **`retry.minTimeout`**: The min timeout to wait before retrying.
* **`retry.factor`**: The factor in which to increase the retry timeout.
* **`retry.retries`**: The max number of retries to attempt.

##### Subscriptions
If primus disconnects and reconnects, any graphql subscriptions that were not disposed will resend the same query and resume. If this behavior is undesired dispose the subscription on primus 'disconnect'.

##### Relay Example
```js
import React from 'react'
import ReactDom from 'react-dom'

import PrimusRelayNetwork from 'primus-graphql/relay-network'
import { QueryRenderer, graphql } from 'react-relay';
import { Environment, RecordSource, Store } from 'relay-runtime';

const primus = new Primus()

const network = new PrimusRelayNetwork(primus, {
  // default options:
  timeout: 15000,
  retry: {
    minTimeout: 1000,
    maxTimeout: 3000,
    factor: 3,
    retries: 2
  }
})

const environment = new Environment({
  network: network,
  store: new Store(new RecordSource()),
});


ReactDOM.render(
  <QueryRenderer
    environment={environment}
    query={graphql`
      query appQuery {
        viewer {
          ...App_viewer
        }
      }
    `}
    render={({error, props}) => {
      if (error) {
        return <div>{error.message}</div>
      }
      if (!props) {
        return <div>Loading</div>
      }
      return <div>{`viewer: ${JSON.stringify(props.viewer)}`}</div>
    }}
  />,
  document.getElementById('root'),
)
```

##### Full query, mutation, and subscriptions examples
Check out the end-to-end tests here: __browser_tests__/primus-graphql.e2e.js

# Changelog
[CHANGELOG.md](https://github.com/tjmehta/primus-graphql/blob/master/CHANGELOG.md)

# Thank you
Thank you to the contributors of Primus, GraphQL, and Relay!

# License
MIT
