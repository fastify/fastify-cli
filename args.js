'use strict'

const argv = require('yargs-parser')
const dotenv = require('dotenv')

const DEFAULT_IGNORE = 'node_modules build dist .git bower_components logs .swp .nyc_output'

module.exports = function parseArgs (args) {
  dotenv.config()
  const parsedArgs = argv(args, {
    configuration: {
      'populate--': true
    },
    number: ['port', 'inspect-port', 'body-limit', 'plugin-timeout'],
    string: ['log-level', 'address', 'socket', 'prefix', 'ignore-watch', 'logging-module', 'debug-host', 'lang', 'require'],
    boolean: ['pretty-logs', 'options', 'watch', 'verbose-watch', 'debug'],
    envPrefix: 'FASTIFY_',
    alias: {
      port: ['p'],
      socket: ['s'],
      help: ['h'],
      options: ['o'],
      address: ['a'],
      watch: ['w'],
      prefix: ['x'],
      require: ['r'],
      debug: ['d'],
      'debug-port': ['I'],
      'log-level': ['l'],
      'pretty-logs': ['P'],
      'plugin-timeout': ['T'],
      'logging-module': ['L']
    },
    default: {
      'log-level': 'fatal',
      'pretty-logs': false,
      watch: false,
      verboseWatch: false,
      debug: false,
      debugPort: 9320,
      options: false,
      'plugin-timeout': 10 * 1000, // everything should load in 10 seconds
      lang: 'js'
    }
  })

  const additionalArgs = parsedArgs['--'] || []
  const { _, ...pluginOptions } = argv(additionalArgs)
  const ignoreWatchArg = parsedArgs.ignoreWatch || ''

  let ignoreWatch = `${DEFAULT_IGNORE} ${ignoreWatchArg}`.trim()
  if (ignoreWatchArg.includes('.ts$')) {
    ignoreWatch = ignoreWatch.replace('dist', '')
  }

  return {
    _: parsedArgs._,
    '--': additionalArgs,
    port: parsedArgs.port,
    bodyLimit: parsedArgs.bodyLimit,
    pluginTimeout: parsedArgs.pluginTimeout,
    pluginOptions,
    prettyLogs: parsedArgs.prettyLogs,
    options: parsedArgs.options,
    watch: parsedArgs.watch,
    debug: parsedArgs.debug,
    debugPort: parsedArgs.debugPort,
    debugHost: parsedArgs.debugHost,
    ignoreWatch,
    verboseWatch: parsedArgs.verboseWatch,
    logLevel: parsedArgs.logLevel,
    address: parsedArgs.address,
    socket: parsedArgs.socket,
    require: parsedArgs.require,
    prefix: parsedArgs.prefix,
    loggingModule: parsedArgs.loggingModule,
    lang: parsedArgs.lang
  }
}
