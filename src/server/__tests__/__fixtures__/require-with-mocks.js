/* eslint-env jest */
const path = require('path')

const parent = module.parent

module.exports = function requireWithMocks (module, mocks) {
  Object.keys(mocks).forEach((moduleName) => {
    if (~moduleName.indexOf('/')) {
      jest.doMock(path.resolve(parent.filename, '..', moduleName), () => mocks[moduleName])
    } else {
      jest.doMock(moduleName, () => mocks[moduleName])
    }
  })
  return require(path.resolve(parent.filename, '..', module))
}
