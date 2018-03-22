var debug = require('debug')('primus-graphql:fixtures:graphql-schema')
var GraphQL = require('graphql')
var Relay = require('graphql-relay')

var db = require('./mem-db.js') // In memory database
var GraphQLRelaySubscription = require('graphql-relay-subscription')
var UserChangesIterator = require('./user-changes-iterator')
require('../../src/shared/subscription-dispose.js')

var relaySubscription = GraphQLRelaySubscription.subscriptionWithClientId
var GraphQLInputObjectType = GraphQL.GraphQLInputObjectType
var GraphQLSchema = GraphQL.GraphQLSchema
var GraphQLString = GraphQL.GraphQLString
var GraphQLNonNull = GraphQL.GraphQLNonNull
var GraphQLObjectType = GraphQL.GraphQLObjectType

// GraphQL types

var UserType = new GraphQLObjectType({
  name: 'User',
  description: 'user',
  fields: {
    id: { type: GraphQLString },
    name: { type: GraphQLString },
    idAndName: {
      type: GraphQLString,
      resolve: function (user) {
        return user.id + ':' + user.name
      }
    }
  }
})

// GraphQL mutations

var CreateUserMutation = Relay.mutationWithClientMutationId({
  name: 'CreateUser',
  inputFields: {
    name: {
      type: new GraphQLNonNull(GraphQLString)
    }
  },
  outputFields: {
    user: {
      type: UserType
    }
  },
  mutateAndGetPayload (fields, ctx) {
    debug('createUser')
    return {
      user: db.createUser(fields)
    }
  }
})

var UpdateUserMutation = Relay.mutationWithClientMutationId({
  name: 'UpdateUser',
  inputFields: {
    id: {
      type: new GraphQLNonNull(GraphQLString)
    },
    name: {
      type: GraphQLString
    }
  },
  outputFields: {
    user: {
      type: UserType
    }
  },
  mutateAndGetPayload (fields, ctx) {
    // hard-coded
    debug('updateUser', fields.id)
    return {
      user: db.updateUser(fields.id, fields)
    }
  }
})

// GraphQL error subscriptions

var invalidName = 'InvalidSubscription'
var InvalidSubscription = {
  name: invalidName,
  type: new GraphQLObjectType({
    name: invalidName + 'Output',
    fields: {
      user: {
        type: UserType
      }
    }
  }),
  args: {
    input: {
      type: new GraphQLInputObjectType({
        name: invalidName + 'Input',
        fields: {
          id: {
            type: new GraphQLNonNull(GraphQLString)
          }
        }
      })
    }
  }
}

var subscribeThrows = relaySubscription({
  name: 'subscribeThrows',
  inputFields: {
    id: {
      type: new GraphQLNonNull(GraphQLString)
    }
  },
  outputFields: {
    user: {
      type: UserType
    }
  },
  subscribe: function () {
    throw new Error('subscribe error')
  }
})

// GraphQL working subscriptions

var UserChanges = relaySubscription({
  name: 'UserChanges',
  inputFields: {
    id: {
      type: new GraphQLNonNull(GraphQLString)
    }
  },
  outputFields: {
    user: {
      type: UserType
    }
  },
  subscribe: function (input) {
    var event = 'users:' + input.id
    debug('subscribeUser', event, input, input.id)
    return new UserChangesIterator(input.id)
  }
})

var UserChangesPromise = relaySubscription({
  name: 'UserChangesPromise',
  inputFields: {
    id: {
      type: new GraphQLNonNull(GraphQLString)
    }
  },
  outputFields: {
    user: {
      type: UserType
    }
  },
  subscribe: function (input) {
    var event = 'users:' + input.id
    debug('subscribeUser', event, input, input.id)
    var iterator = new UserChangesIterator(input.id)
    // promise
    return Promise.resolve(iterator)
  }
})

// GraphQL roots

var Mutation = new GraphQLObjectType({
  name: 'Mutation',
  description: 'Root query',
  fields: {
    createUser: CreateUserMutation,
    updateUser: UpdateUserMutation
  }
})

var Query = new GraphQLObjectType({
  name: 'Query',
  description: 'Root query',
  fields: {
    user: {
      type: UserType,
      args: {
        id: {
          type: GraphQLString
        }
      },
      resolve: function (ctx, args) {
        var user = db.getUser(args.id)
        debug('getUser', user)
        return user
      }
    }
  }
})

var Subscription = new GraphQLObjectType({
  name: 'Subscription',
  description: 'Root subscription',
  fields: {
    userChanges: UserChanges,
    userChangesPromise: UserChangesPromise,
    invalidSubscription: InvalidSubscription,
    subscribeThrows: subscribeThrows
  }
})

module.exports = new GraphQLSchema({
  mutation: Mutation,
  query: Query,
  subscription: Subscription
})
