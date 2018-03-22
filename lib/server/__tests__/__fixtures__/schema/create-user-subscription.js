const GraphQL = require('graphql')
const GraphQLRelaySubscription = require('graphql-relay-subscription')

const UserType = require('./user-type')

module.exports = (userSubscribe) => GraphQLRelaySubscription.subscriptionWithClientId({
  name: 'UserChanges',
  inputFields: {
    id: {
      type: new GraphQL.GraphQLNonNull(GraphQL.GraphQLString)
    }
  },
  outputFields: {
    user: {
      type: UserType
    }
  },
  subscribe: userSubscribe
})
