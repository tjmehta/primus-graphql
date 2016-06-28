# primus-graphql [![Build Status](https://travis-ci.org/tjmehta/primus-graphql.svg?branch=master)](https://travis-ci.org/tjmehta/primus-graphql) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)
Primus server/client plugin for GraphQL

# Installation
```bash
npm i --save primus-graphql
```

# Usage
### GraphQL Example
Client Example:
```js

var client = new Primus(primusUrl)
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

var primus = new Primus(server, {
  transport: /* transport */,
  parser: 'json',
  graphql: {}
})

primus.use('graphql', primusGraphQL({
  schema: schema
}))

primus.on('connection', function (spark) {
  spark.graphql()
})
```

### Relay Example
```js
var Relay = require('react-relay')
var PrimusRelayNetworkAdapter = require('primus-graphql/relay-network-layer')
var primus = /* primus client */


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

# License
MIT
