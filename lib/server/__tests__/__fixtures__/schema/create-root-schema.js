const GraphQL = require('graphql')

module.exports = (resolvers, subscribers) => new GraphQL.GraphQLSchema({
  query: new GraphQL.GraphQLObjectType({
    name: 'RootQuery',
    fields: {
      user: require('./create-user-query')(resolvers && resolvers.user)
    }
  }),
  subscription: new GraphQL.GraphQLObjectType({
    name: 'RootSubscription',
    fields: {
      userChanges: require('./create-user-subscription')(subscribers && subscribers.userChanges)
    }
  })
})
