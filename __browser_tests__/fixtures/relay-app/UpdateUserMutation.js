var Relay = require('react-relay')
var getEnvironment = require('./get-relay-environment')
var graphql = Relay.graphql

var newEnvironment = getEnvironment.newEnvironment

graphql`
  fragment UpdateUserMutation_user on User {
    id
  }
`

var mutation = graphql`
  mutation UpdateUserMutation($input: UpdateUserInput!) {
    updateUser(input: $input) {
      user {
        id
        name
      }
    }
  }
`

module.exports = function updateUserMutation (id, name, dontUpdateEnv) {
  var variables = {
    input: {
      id: id,
      name: name
    }
  }
  Relay.commitMutation(
    dontUpdateEnv ? newEnvironment() : getEnvironment(),
    {
      mutation: mutation,
      variables: variables,
      // don't implement optimistic-updater,
      // so tests verify updated data from server
      onCompleted: function (response, errors) {
        console.log('Update user response', response, errors)
      },
      onError: function (err) {
        console.error(err)
      }
    }
  )
}
