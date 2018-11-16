'use strict'

const argv = require('yargs-parser')

module.exports = function parseArgs (args) {
  return argv(args, {
    number: ['port', 'body-limit', 'plugin-timeout'],
    boolean: ['pretty-logs', 'options', 'watch'],
    string: ['log-level', 'address', 'socket', 'prefix'],
    envPrefix: 'FASTIFY_',
    alias: {
      port: ['p'],
      socket: ['s'],
      help: ['h'],
      options: ['o'],
      address: ['a'],
      watch: ['w'],
      prefix: ['r'],
      'log-level': ['l'],
      'pretty-logs': ['P'],
      'plugin-timeout': ['T']
    },
    default: {
      'pretty-logs': false,
      'watch': false,
      'options': false
    }
  })
}
