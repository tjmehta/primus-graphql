const UserType = require('./user-type')

module.exports = (userResolve) => ({
  type: UserType,
  args: {},
  resolve: userResolve
})
