var Relay = require('react-relay')

class UserRoute extends Relay.Route {}

UserRoute.queries = {
  me: (Component) => Relay.QL`
    query UserQuery {
      me {
        ${Component.getFragment('me')}
      }
    }
  `
}
UserRoute.routeName = 'User'

module.exports = UserRoute
