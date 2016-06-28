var React = require('react')
var Relay = require('react-relay')

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

module.exports = Relay.createContainer(UserComponent, {
  fragments: {
    user: () => Relay.QL`
      fragment on User {
        id,
        name
      }
    `
  }
})

module.exports.UserComponent = UserComponent
