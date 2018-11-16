const t = require('tap')
const test = t.test
const parseArgs = require('../args')

test('should parse args correctly', t => {
  t.plan(1)

  const argv = [
    '--port', '7777',
    '--address', 'fastify.io:9999',
    '--socket', 'fastify.io.socket:9999',
    '--log-level', 'info',
    '--pretty-logs', 'true',
    '--watch', 'true',
    '--options', 'true',
    '--prefix', 'YFITSAF_',
    '--plugin-timeout', '500',
    '--body-limit', '5242880'
  ]
  const parsedArgs = parseArgs(argv)

  t.strictDeepEqual(parsedArgs, { _: [],
    'pretty-logs': true,
    P: true,
    prettyLogs: true,
    options: true,
    o: true,
    watch: true,
    w: true,
    port: 7777,
    p: 7777,
    address: 'fastify.io:9999',
    a: 'fastify.io:9999',
    socket: 'fastify.io.socket:9999',
    s: 'fastify.io.socket:9999',
    'log-level': 'info',
    l: 'info',
    logLevel: 'info',
    prefix: 'YFITSAF_',
    r: 'YFITSAF_',
    'plugin-timeout': 500,
    T: 500,
    pluginTimeout: 500,
    'body-limit': 5242880,
    bodyLimit: 5242880
  })
})

test('should parse env vars correctly', t => {
  t.plan(1)

  process.env.FASTIFY_PORT = '7777'
  process.env.FASTIFY_ADDRESS = 'fastify.io:9999'
  process.env.FASTIFY_SOCKET = 'fastify.io.socket:9999'
  process.env.FASTIFY_LOG_LEVEL = 'info'
  process.env.FASTIFY_PRETTY_LOGS = 'true'
  process.env.FASTIFY_WATCH = 'true'
  process.env.FASTIFY_OPTIONS = 'true'
  process.env.FASTIFY_PREFIX = 'YFITSAF_'
  process.env.FASTIFY_BODY_LIMIT = '5242880'

  const parsedArgs = parseArgs([])

  t.strictDeepEqual(parsedArgs, { _: [],
    'pretty-logs': true,
    P: true,
    prettyLogs: true,
    options: true,
    o: true,
    watch: true,
    w: true,
    address: 'fastify.io:9999',
    a: 'fastify.io:9999',
    bodyLimit: 5242880,
    logLevel: 'info',
    'log-level': 'info',
    l: 'info',
    port: 7777,
    p: 7777,
    prefix: 'YFITSAF_',
    r: 'YFITSAF_',
    socket: 'fastify.io.socket:9999',
    s: 'fastify.io.socket:9999'
  })
})
