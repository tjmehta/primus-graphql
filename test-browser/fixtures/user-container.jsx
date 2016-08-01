var React = require('react')
var Relay = require('react-relay')

var UserSubscription = require('./queries/user-subscription.js')
var UpdateMeMutation = require('./queries/update-me-mutation.js')

class UserComponent extends React.Component {
  render () {
    return <div>
      <div>
        <span>ID:</span>
        {this.props.me.id}
      </div>
      <div>
        <span>NAME:</span>
        {this.props.me.name}
      </div>
    </div>
  }
}

module.exports = Relay.createContainer(UserComponent, {
  fragments: {
    me: () => Relay.QL`
      fragment on User {
        id,
        name,
        ${UpdateMeMutation.getFragment('me')},
        ${UserSubscription.getFragment('me')}
      }
    `
  }
})

module.exports.UserComponent = UserComponent
