var afterEach = global.afterEach
var beforeEach = global.beforeEach
var describe = global.describe
var it = global.it
var Primus = global.Primus

var url = require('url')

var assign = require('101/assign')
var expect = require('chai').expect

var parseErr = function (json) {
  var err = new Error(json.message)
  assign(err, json)
  return err
}
var primusUrl = url.format({
  protocol: 'http:',
  host: 'localhost:' + 9876,
  pathname: 'primus'
})

describe('Client tests', function () {
  it('should connect', function (done) {
    var client = new Primus(primusUrl)
    client.end()
    done()
  })

  it('should allow a graphql query', function () {
    var client = new Primus(primusUrl)
    var query = 'query { user { id, name } }'
    return client.graphql(query).then(function (data) {
      if (data.errors) {
        throw data.errors.map(parseErr)[0]
      }
      expect(data.data.user).to.deep.equal({ id: '1', name: 'name' })
    })
  })
})
