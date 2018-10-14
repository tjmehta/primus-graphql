var Relay = require('react-relay')
var getEnvironment = require('./get-relay-environment')
var graphql = Relay.graphql

graphql`
  fragment UserSubscription_user on User {
    id
  }
`

var subscription = graphql`
  subscription UserSubscription($input: UserChangesInput!) {
    userChanges(input: $input) {
      user {
        id
        name
      }
    }
  }
`

module.exports = function subscribeToUserSubscription (userId, cb) {
  console.log('subscribeToUserSubscription', userId)
  var variables = {
    input: {
      id: userId
    }
  }
  return Relay.requestSubscription(
    getEnvironment(),
    {
      subscription: subscription,
      variables: variables,
      onCompleted: function () {
        console.log('UserSubscription: completed')
      },
      onNext: function () {
        if (cb) cb()
        cb = null
      },
      onError: function (err) {
        console.error('UserSubscription error: ', err, err.stack)
      }
    }
  )
}
