var Relay = require('react-relay')

class UpdateMeMutation extends Relay.Mutation {
  getCollisionKey () {
    return 'update_' + this.props.me.id
  }
  getConfigs () {
    return [{
      type: 'FIELDS_CHANGE',
      fieldIDs: { user: this.props.me.id }
    }]
  }
  getFatQuery () {
    return Relay.QL`
      fragment on UpdateMePayload {
        user {
          name
        }
      }
    `
  }
  getMutation () {
    return Relay.QL`
      mutation{ updateMe }
    `
  }
  getVariables () {
    return this.props.input
  }
}

UpdateMeMutation.fragments = {
  me: () => Relay.QL`
    fragment on User {
      id
    }
  `
}

module.exports = UpdateMeMutation
