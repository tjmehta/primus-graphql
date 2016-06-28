// Karma configuration
require('./fixtures/karma-primus.js')
var path = require('path')

var json = {
  // base path that will be used to resolve all patterns (eg. files, exclude)
  basePath: '',

  // frameworks to use
  // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
  frameworks: [
    'browserify',
    'mocha'
  ],

  // mocha config
  client: {
    captureConsole: true,
    mocha: {
      timeout: 20000
    }
  },

  // list of files / patterns to load in the browser
  files: [
    'fixtures/primus-client.js',
    '*.js'
  ],

  // list of files to exclude
  exclude: [
  ],

  // preprocess matching files before serving them to the browser
  // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
  preprocessors: {
    '*.js': [ 'browserify' ]
  },

  // browserify options
  browserify: {
    debug: true,
    transform: [
      ['babelify', {
        plugins: [path.join(__dirname, '/fixtures/babel-relay-plugin.js')],
        presets: ['es2015', 'react']
      }]
    ]
  },

  // test results reporter to use
  // possible values: 'dots', 'progress'
  // available reporters: https://npmjs.org/browse/keyword/karma-reporter
  reporters: ['progress'],

  // web server port
  port: 9876,

  // enable / disable colors in the output (reporters and logs)
  colors: true,

  // enable / disable watching file and executing tests whenever any file changes
  autoWatch: false,

  // start these browsers
  // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
  browsers: ['Chrome'],

  // Continuous Integration mode
  // if true, Karma captures browsers, runs the tests and exits
  singleRun: true,

  // Concurrency level
  // how many browser should be started simultaneous
  concurrency: Infinity,

  // Travis
  customLaunchers: {
    Chrome_travis_ci: {
      base: 'Chrome',
      flags: ['--no-sandbox']
    }
  }
}

if (process.env.TRAVIS) {
  json.browsers = ['Chrome_travis_ci']
}

module.exports = function (config) {
  // level of logging
  // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
  json.logLevel = config.LOG_INFO
  config.set(json)
}

