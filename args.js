'use strict'

const argv = require('yargs-parser')

module.exports = function parseArgs (args) {
  const parsedArgs = argv(args, {
    number: ['port', 'inspect-port', 'body-limit', 'plugin-timeout'],
    boolean: ['pretty-logs', 'options', 'watch', 'debug'],
    string: ['log-level', 'address', 'socket', 'prefix', 'ignore-watch', 'logging-module'],
    envPrefix: 'FASTIFY_',
    alias: {
      port: ['p'],
      socket: ['s'],
      help: ['h'],
      options: ['o'],
      address: ['a'],
      watch: ['w'],
      prefix: ['r'],
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
      debug: false,
      debugPort: 9320,
      'ignore-watch': 'node_modules build dist .git bower_components logs',
      options: false,
      'plugin-timeout': 10 * 1000 // everything should load in 10 seconds
    }
  })

  return {
    _: parsedArgs._,
    port: parsedArgs.port,
    bodyLimit: parsedArgs.bodyLimit,
    pluginTimeout: parsedArgs.pluginTimeout,
    prettyLogs: parsedArgs.prettyLogs,
    options: parsedArgs.options,
    watch: parsedArgs.watch,
    debug: parsedArgs.debug,
    debugPort: parsedArgs.debugPort,
    ignoreWatch: parsedArgs.ignoreWatch,
    logLevel: parsedArgs.logLevel,
    address: parsedArgs.address,
    socket: parsedArgs.socket,
    prefix: parsedArgs.prefix,
    loggingModule: parsedArgs.loggingModule
  }
}
