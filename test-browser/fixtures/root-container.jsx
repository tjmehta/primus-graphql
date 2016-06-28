var React = require('react')
var Relay = require('react-relay')
var UserContainer = require('./user-container.jsx')
var UserRoute = require('./user-route.jsx')

module.exports = <Relay.RootContainer
  Component={UserContainer}
  route={new UserRoute()}
/>
