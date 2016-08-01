var Relay = require('react-relay')

class UserSubscription extends Relay.Subscription {
  getCollisionKey () {
    return 'subscribe_' + this.props.me.id
  }
  getConfigs () {
    return [{
      type: 'FIELDS_CHANGE',
      fieldIDs: { user: this.props.me.id }
    }]
  }
  getSubscription () {
    return Relay.QL`
      subscription userSubscription ($input: UserChangesInput!) {
        userChanges (input: $input) {
          user {
            name
          }
        }
      }
    `
  }
  getVariables () {
    return {
      id: this.props.me.id
    }
  }
}
UserSubscription.fragments = {
  me: () => Relay.QL`
    fragment on User {
      id
    }
  `
}

module.exports = UserSubscription
