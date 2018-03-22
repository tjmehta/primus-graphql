const EventEmitter = require('events').EventEmitter

module.exports = function createMockSpark (id) {
  const mockSpark = new EventEmitter()
  mockSpark.id = id || 'sparkId'
  return mockSpark
}
