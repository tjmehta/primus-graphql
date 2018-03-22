var React = require('react')
var Relay = require('react-relay')
var graphql = Relay.graphql

class UserComponent extends React.Component {
  render () {
    return <div>
      <div>
        <span>ID:</span>
        {this.props.user.id}
      </div>
      <div>
        <span>NAME:</span>
        {this.props.user.name}
      </div>
    </div>
  }
}

module.exports = Relay.createFragmentContainer(UserComponent, {
  user: graphql`
    fragment UserContainer_user on User {
      id,
      name,
      ...UpdateUserMutation_user,
      ...UserSubscription_user
    }
  `
})

module.exports.UserComponent = UserComponent
