var React = require('react')
var Relay = require('react-relay')
var UserContainer = require('./UserContainer.js')
var getEnvironment = require('./get-relay-environment')
var QueryRenderer = Relay.QueryRenderer
var graphql = Relay.graphql

var rootContainer = null

module.exports = function getRootContainer (primus, userId) {
  rootContainer = <QueryRenderer
    environment={getEnvironment(primus)}
    query={graphql`
      query getRootContainerQuery ($userId: String) {
        user (id: $userId) {
          ...UserContainer_user
        }
      }
    `}
    variables={{userId: userId}}
    render={({error, props}) => {
      if (error) {
        return <div>{error.message}</div>
      } else if (props) {
        return <UserContainer {...props} />
      }
      return <div>Loading</div>
    }}
  />
  return rootContainer
}
