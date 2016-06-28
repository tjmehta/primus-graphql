const schema = require('../../test/fixtures/graphql-schema.json')

module.exports = require('babel-relay-plugin')(schema)
