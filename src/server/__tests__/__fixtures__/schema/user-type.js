const GraphQL = require('graphql')

module.exports = new GraphQL.GraphQLObjectType({
  name: 'User',
  fields: {
    id: {
      type: GraphQL.GraphQLString
    },
    name: {
      type: GraphQL.GraphQLString
    }
  }
})
