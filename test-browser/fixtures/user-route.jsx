var Relay = require('react-relay')

class UserRoute extends Relay.Route {}

UserRoute.queries = {
  user: (Component) => Relay.QL`
    query UserQuery {
      user {
        ${Component.getFragment('user')}
      }
    }
  `
}
UserRoute.routeName = 'User'

module.exports = UserRoute
