'use strict'

const { test } = require('node:test')
const parseArgs = require('../args')

test('should parse args correctly', t => {
  t.plan(1)

  const argv = [
    '--port', '7777',
    '--address', 'fastify.dev:9999',
    '--socket', 'fastify.dev.socket:9999',
    '--require', './require-module.js',
    '--import', './import-module.js',
    '--log-level', 'info',
    '--pretty-logs', 'true',
    '--watch', 'true',
    '--ignore-watch', 'ignoreme.js',
    '--verbose-watch', 'true',
    '--options', 'true',
    '--prefix', 'FASTIFY_',
    '--plugin-timeout', '500',
    '--close-grace-delay', '30000',
    '--body-limit', '5242880',
    '--debug', 'true',
    '--debug-port', 1111,
    '--debug-host', '1.1.1.1',
    '--logging-module', './custom-logger.js',
    '--trust-proxy-enabled', 'true',
    'app.js'
  ]
  const parsedArgs = parseArgs(argv)

  t.assert.deepStrictEqual(parsedArgs, {
    _: ['app.js'],
    '--': [],
    prettyLogs: true,
    options: true,
    watch: true,
    ignoreWatch: 'node_modules build dist .git bower_components logs .swp .nyc_output ignoreme.js',
    verboseWatch: true,
    port: 7777,
    address: 'fastify.dev:9999',
    socket: 'fastify.dev.socket:9999',
    require: './require-module.js',
    import: './import-module.js',
    logLevel: 'info',
    prefix: 'FASTIFY_',
    pluginTimeout: 500,
    closeGraceDelay: 30000,
    pluginOptions: {},
    bodyLimit: 5242880,
    debug: true,
    debugPort: 1111,
    debugHost: '1.1.1.1',
    loggingModule: './custom-logger.js',
    lang: 'js',
    method: undefined,
    commonPrefix: false,
    includeHooks: undefined,
    trustProxy: true
  })
})

test('should parse args with = assignment correctly', t => {
  t.plan(1)

  const argv = [
    '--port=7777',
    '--address=fastify.dev:9999',
    '--socket=fastify.dev.socket:9999',
    '--require', './require-module.js',
    '--import', './import-module.js',
    '--log-level=info',
    '--pretty-logs=true',
    '--watch=true',
    '--ignore-watch=ignoreme.js',
    '--verbose-watch=true',
    '--options=true',
    '--prefix=FASTIFY_',
    '--plugin-timeout=500',
    '--close-grace-delay=30000',
    '--body-limit=5242880',
    '--debug=true',
    '--debug-port', 1111,
    '--debug-host', '1.1.1.1',
    '--logging-module', './custom-logger.js',
    '--trust-proxy-hop', '2',
    'app.js'
  ]
  const parsedArgs = parseArgs(argv)

  t.assert.deepStrictEqual(parsedArgs, {
    _: ['app.js'],
    '--': [],
    prettyLogs: true,
    options: true,
    watch: true,
    ignoreWatch: 'node_modules build dist .git bower_components logs .swp .nyc_output ignoreme.js',
    verboseWatch: true,
    port: 7777,
    address: 'fastify.dev:9999',
    socket: 'fastify.dev.socket:9999',
    require: './require-module.js',
    import: './import-module.js',
    logLevel: 'info',
    prefix: 'FASTIFY_',
    pluginTimeout: 500,
    closeGraceDelay: 30000,
    pluginOptions: {},
    bodyLimit: 5242880,
    debug: true,
    debugPort: 1111,
    debugHost: '1.1.1.1',
    loggingModule: './custom-logger.js',
    lang: 'js',
    method: undefined,
    commonPrefix: false,
    includeHooks: undefined,
    trustProxy: 2
  })
})

test('should parse env vars correctly', t => {
  t.plan(1)

  process.env.FASTIFY_PORT = '7777'
  process.env.FASTIFY_ADDRESS = 'fastify.dev:9999'
  process.env.FASTIFY_SOCKET = 'fastify.dev.socket:9999'
  process.env.FASTIFY_REQUIRE = './require-module.js'
  process.env.FASTIFY_IMPORT = './import-module.js'
  process.env.FASTIFY_LOG_LEVEL = 'info'
  process.env.FASTIFY_PRETTY_LOGS = 'true'
  process.env.FASTIFY_WATCH = 'true'
  process.env.FASTIFY_IGNORE_WATCH = 'ignoreme.js'
  process.env.FASTIFY_VERBOSE_WATCH = 'true'
  process.env.FASTIFY_OPTIONS = 'true'
  process.env.FASTIFY_PREFIX = 'FASTIFY_'
  process.env.FASTIFY_BODY_LIMIT = '5242880'
  process.env.FASTIFY_PLUGIN_TIMEOUT = '500'
  process.env.FASTIFY_CLOSE_GRACE_DELAY = '30000'
  process.env.FASTIFY_DEBUG = 'true'
  process.env.FASTIFY_DEBUG_PORT = '1111'
  process.env.FASTIFY_DEBUG_HOST = '1.1.1.1'
  process.env.FASTIFY_LOGGING_MODULE = './custom-logger.js'
  process.env.FASTIFY_TRUST_PROXY_ENABLED = 'true'

  t.after(() => {
    delete process.env.FASTIFY_PORT
    delete process.env.FASTIFY_ADDRESS
    delete process.env.FASTIFY_SOCKET
    delete process.env.FASTIFY_REQUIRE
    delete process.env.FASTIFY_IMPORT
    delete process.env.FASTIFY_LOG_LEVEL
    delete process.env.FASTIFY_PRETTY_LOGS
    delete process.env.FASTIFY_WATCH
    delete process.env.FASTIFY_IGNORE_WATCH
    delete process.env.FASTIFY_VERBOSE_WATCH
    delete process.env.FASTIFY_OPTIONS
    delete process.env.FASTIFY_PREFIX
    delete process.env.FASTIFY_BODY_LIMIT
    delete process.env.FASTIFY_PLUGIN_TIMEOUT
    delete process.env.FASTIFY_CLOSE_GRACE_DELAY
    delete process.env.FASTIFY_DEBUG
    delete process.env.FASTIFY_DEBUG_PORT
    delete process.env.FASTIFY_LOGGING_MODULE
    delete process.env.FASTIFY_TRUST_PROXY_ENABLED
  })

  const parsedArgs = parseArgs([])

  t.assert.deepStrictEqual(parsedArgs, {
    _: [],
    '--': [],
    prettyLogs: true,
    options: true,
    watch: true,
    ignoreWatch: 'node_modules build dist .git bower_components logs .swp .nyc_output ignoreme.js',
    verboseWatch: true,
    address: 'fastify.dev:9999',
    bodyLimit: 5242880,
    logLevel: 'info',
    port: 7777,
    prefix: 'FASTIFY_',
    socket: 'fastify.dev.socket:9999',
    require: './require-module.js',
    import: './import-module.js',
    pluginTimeout: 500,
    closeGraceDelay: 30000,
    pluginOptions: {},
    debug: true,
    debugPort: 1111,
    debugHost: '1.1.1.1',
    loggingModule: './custom-logger.js',
    lang: 'js',
    method: undefined,
    commonPrefix: false,
    includeHooks: undefined,
    trustProxy: true
  })
})

test('should respect default values', t => {
  t.plan(14)

  const argv = [
    'app.js'
  ]

  const parsedArgs = parseArgs(argv)

  t.assert.equal(parsedArgs._[0], 'app.js')
  t.assert.equal(parsedArgs.options, false)
  t.assert.equal(parsedArgs.prettyLogs, false)
  t.assert.equal(parsedArgs.watch, false)
  t.assert.equal(parsedArgs.ignoreWatch, 'node_modules build dist .git bower_components logs .swp .nyc_output')
  t.assert.equal(parsedArgs.verboseWatch, false)
  t.assert.equal(parsedArgs.logLevel, 'fatal')
  t.assert.equal(parsedArgs.pluginTimeout, 10000)
  t.assert.equal(parsedArgs.closeGraceDelay, 500)
  t.assert.equal(parsedArgs.debug, false)
  t.assert.equal(parsedArgs.debugPort, 9320)
  t.assert.equal(parsedArgs.loggingModule, undefined)
  t.assert.equal(parsedArgs.require, undefined)
  t.assert.equal(parsedArgs.import, undefined)
})

test('should parse custom plugin options', t => {
  t.plan(1)

  const argv = [
    '--port', '7777',
    '--address', 'fastify.dev:9999',
    '--socket', 'fastify.dev.socket:9999',
    '--require', './require-module.js',
    '--import', './import-module.js',
    '--log-level', 'info',
    '--pretty-logs', 'true',
    '--watch', 'true',
    '--ignore-watch', 'ignoreme.js',
    '--verbose-watch', 'true',
    '--options', 'true',
    '--prefix', 'FASTIFY_',
    '--plugin-timeout', '500',
    '--close-grace-delay', '30000',
    '--body-limit', '5242880',
    '--debug', 'true',
    '--debug-port', 1111,
    '--debug-host', '1.1.1.1',
    '--logging-module', './custom-logger.js',
    'app.js',
    '--',
    '-abc',
    '--hello', 'world'
  ]
  const parsedArgs = parseArgs(argv)

  t.assert.deepStrictEqual(parsedArgs, {
    _: ['app.js'],
    '--': [
      '-abc',
      '--hello',
      'world'
    ],
    prettyLogs: true,
    options: true,
    watch: true,
    ignoreWatch: 'node_modules build dist .git bower_components logs .swp .nyc_output ignoreme.js',
    verboseWatch: true,
    port: 7777,
    address: 'fastify.dev:9999',
    socket: 'fastify.dev.socket:9999',
    require: './require-module.js',
    import: './import-module.js',
    logLevel: 'info',
    prefix: 'FASTIFY_',
    pluginTimeout: 500,
    closeGraceDelay: 30000,
    pluginOptions: {
      a: true,
      b: true,
      c: true,
      hello: 'world'
    },
    bodyLimit: 5242880,
    debug: true,
    debugPort: 1111,
    debugHost: '1.1.1.1',
    loggingModule: './custom-logger.js',
    lang: 'js',
    method: undefined,
    commonPrefix: false,
    includeHooks: undefined,
    trustProxy: undefined
  })
})

test('should parse config file correctly and prefer config values over default ones', t => {
  t.plan(1)

  const argv = [
    '--config', './test/data/custom-config.js',
    'app.js'
  ]
  const parsedArgs = parseArgs(argv)

  t.assert.deepStrictEqual(parsedArgs, {
    _: ['app.js'],
    '--': [],
    port: 5000,
    bodyLimit: undefined,
    pluginTimeout: 9000,
    closeGraceDelay: 1000,
    pluginOptions: {},
    prettyLogs: true,
    options: false,
    watch: true,
    debug: false,
    debugPort: 4000,
    debugHost: '1.1.1.1',
    ignoreWatch: 'node_modules build dist .git bower_components logs .swp .nyc_output',
    verboseWatch: false,
    logLevel: 'fatal',
    address: 'fastify.dev:9999',
    socket: undefined,
    require: undefined,
    import: undefined,
    prefix: 'FASTIFY_',
    loggingModule: undefined,
    lang: 'js',
    method: undefined,
    commonPrefix: false,
    includeHooks: undefined,
    trustProxy: undefined
  })
})

test('should prefer command line args over config file options', t => {
  t.plan(1)

  const argv = [
    '--config', './test/data/custom-config.js',
    '--port', '4000',
    '--debugPort', '9320',
    '--plugin-timeout', '10000',
    '--close-grace-delay', '30000',
    'app.js'
  ]
  const parsedArgs = parseArgs(argv)

  t.assert.deepStrictEqual(parsedArgs, {
    _: ['app.js'],
    '--': [],
    port: 4000,
    bodyLimit: undefined,
    pluginTimeout: 10000,
    closeGraceDelay: 30000,
    pluginOptions: {},
    prettyLogs: true,
    options: false,
    watch: true,
    debug: false,
    debugPort: 9320,
    debugHost: '1.1.1.1',
    ignoreWatch: 'node_modules build dist .git bower_components logs .swp .nyc_output',
    verboseWatch: false,
    logLevel: 'fatal',
    address: 'fastify.dev:9999',
    socket: undefined,
    require: undefined,
    import: undefined,
    prefix: 'FASTIFY_',
    loggingModule: undefined,
    lang: 'js',
    method: undefined,
    commonPrefix: false,
    includeHooks: undefined,
    trustProxy: undefined
  })
})

test('should favor trust proxy enabled over trust proxy ips and trust proxy hop', t => {
  t.plan(1)

  const argv = [
    '--port', '4000',
    '--close-grace-delay', '30000',
    '--debug-port', '1111',
    '--debug-host', '1.1.1.1',
    '--trust-proxy-enabled', 'true',
    '--trust-proxy-ips', '127.0.0.1',
    '--trust-proxy-hop', '2',
    'app.js'
  ]
  const parsedArgs = parseArgs(argv)

  t.assert.deepStrictEqual(parsedArgs, {
    _: ['app.js'],
    '--': [],
    port: 4000,
    bodyLimit: undefined,
    pluginTimeout: 10000,
    closeGraceDelay: 30000,
    pluginOptions: {},
    prettyLogs: false,
    options: false,
    watch: false,
    debug: false,
    debugPort: 1111,
    debugHost: '1.1.1.1',
    ignoreWatch: 'node_modules build dist .git bower_components logs .swp .nyc_output',
    verboseWatch: false,
    logLevel: 'fatal',
    address: undefined,
    socket: undefined,
    require: undefined,
    import: undefined,
    prefix: undefined,
    loggingModule: undefined,
    lang: 'js',
    method: undefined,
    commonPrefix: false,
    includeHooks: undefined,
    trustProxy: true
  })
})

test('should favor trust proxy ips over trust proxy hop', t => {
  t.plan(1)

  const argv = [
    '--port', '4000',
    '--close-grace-delay', '30000',
    '--debug-port', '1111',
    '--debug-host', '1.1.1.1',
    '--trust-proxy-ips', '127.0.0.1',
    '--trust-proxy-hop', '2',
    'app.js'
  ]
  const parsedArgs = parseArgs(argv)

  t.assert.deepStrictEqual(parsedArgs, {
    _: ['app.js'],
    '--': [],
    port: 4000,
    bodyLimit: undefined,
    pluginTimeout: 10000,
    closeGraceDelay: 30000,
    pluginOptions: {},
    prettyLogs: false,
    options: false,
    watch: false,
    debug: false,
    debugPort: 1111,
    debugHost: '1.1.1.1',
    ignoreWatch: 'node_modules build dist .git bower_components logs .swp .nyc_output',
    verboseWatch: false,
    logLevel: 'fatal',
    address: undefined,
    socket: undefined,
    require: undefined,
    import: undefined,
    prefix: undefined,
    loggingModule: undefined,
    lang: 'js',
    method: undefined,
    commonPrefix: false,
    includeHooks: undefined,
    trustProxy: '127.0.0.1'
  })
})
