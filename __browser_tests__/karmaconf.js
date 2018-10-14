// Karma configuration
require('./fixtures/karma-primus.js')

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
      timeout: 2000
    }
  },

  // list of files / patterns to load in the browser
  files: [
    'fixtures/primus-client.js',
    'primus-graphql.e2e.js'
  ],

  // list of files to exclude
  exclude: [
  ],

  // preprocess matching files before serving them to the browser
  // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
  preprocessors: {
    'primus-graphql.e2e.js': [ 'browserify' ]
  },

  // browserify options
  browserify: {
    debug: true,
    transform: [
      ['babelify', {
        plugins: ['relay'],
        presets: ['react']
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
  autoWatch: process.env.WATCH,

  // start these browsers
  // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
  browsers: ['Chrome'],

  // Continuous Integration mode
  // if true, Karma captures browsers, runs the tests and exits
  singleRun: !process.env.WATCH,

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
