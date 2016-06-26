var GraphQL = require('graphql')

var GraphQLSchema = GraphQL.GraphQLSchema
var GraphQLString = GraphQL.GraphQLString
var GraphQLObjectType = GraphQL.GraphQLObjectType
console.log(GraphQLString)

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

module.exports = new GraphQLSchema({
  query: Query
})