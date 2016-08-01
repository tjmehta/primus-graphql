var assign = require('101/assign')
var debug = require('debug')('primus-graphql:graphql-relay-subscription')
var GraphQL = require('graphql')

var GraphQLBoolean = GraphQL.GraphQLBoolean
var GraphQLInputObjectType = GraphQL.GraphQLInputObjectType
var GraphQLNonNull = GraphQL.GraphQLNonNull
var GraphQLObjectType = GraphQL.GraphQLObjectType

module.exports = graphqlRelaySubscription

function graphqlRelaySubscription (config) {
  debug('created subscription', config && config.name)
  var extendedInputFields = assign({}, config.inputFields, {
    reconnect: { type: GraphQLBoolean }
  })
  var InputType = new GraphQLInputObjectType({
    name: config.name + 'Input',
    fields: extendedInputFields
  })
  var OutputType = new GraphQLObjectType({
    name: config.name + 'Output',
    fields: config.outputFields
  })
  return {
    name: config.name,
    type: OutputType,
    args: {
      input: {
        type: new GraphQLNonNull(InputType)
      }
    },
    observe: config.observe
  }
}
