var fs = require('fs')
var path = require('path')

var graphql = require('graphql').graphql
var introspectionQuery = require('graphql/utilities').introspectionQuery
var printSchema = require('graphql/utilities').printSchema
var throwNextTick = require('throw-next-tick')

var querySchemaRelPath = '../__browser_tests__/fixtures/graphql-schema.js'
var schema = require(querySchemaRelPath)

var filePath = path.join(__dirname, querySchemaRelPath.replace('.js', ''))
var graphqlFile = `${filePath}.graphql`
var jsonFile = `${filePath}.json`

function getErr (result) {
  var err
  if (result.errors) {
    err = new Error('graphql error')
    err.errors = result.errors
  }
  return err
}

function writeFile (file, data) {
  return new Promise(function (resolve, reject) {
    fs.writeFile(file, data, function (err) {
      if (err) return reject(err)
      resolve()
    })
  })
}

Promise.all([
  // Save user readable type system shorthand of schema
  writeFile(graphqlFile, printSchema(schema)),
  // Save JSON of full schema introspection for Babel Relay Plugin to use
  graphql(schema, introspectionQuery).then(function (result) {
    var err = getErr(result)
    if (err) { throw err }
    return writeFile(jsonFile, JSON.stringify(result.data, null, 2))
  })
])
  .then(function () {
    console.log('Created ' + path.relative(process.cwd(), graphqlFile))
    console.log('Created ' + path.relative(process.cwd(), jsonFile))
  })
  .catch(throwNextTick)
