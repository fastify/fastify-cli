#! /usr/bin/env node

'use strict'

const path = require('path')
const fs = require('fs')
const assert = require('assert')

const updateNotifier = require('update-notifier')
const minimist = require('minimist')
const PinoColada = require('pino-colada')
const pump = require('pump')
const resolveFrom = require('resolve-from')
const fp = require('fastify-plugin')
let Fastify = null
let fastifyPackageJSON = null

function loadModules (opts) {
  try {
    const basedir = path.resolve(process.cwd(), opts._[0])

    Fastify = require(resolveFrom.silent(basedir, 'fastify') || 'fastify')
    fastifyPackageJSON = require(resolveFrom.silent(basedir, 'fastify/package.json') || 'fastify/package.json')
  } catch (e) {
    module.exports.stop(e)
  }
}

function showHelp () {
  console.log(fs.readFileSync(path.join(__dirname, 'help', 'start.txt'), 'utf8'))
  return module.exports.stop()
}

function start (opts) {
  if (opts.help) {
    return showHelp()
  }

  if (opts._.length !== 1) {
    console.error('Error: Missing the required file parameter\n')
    return showHelp()
  }

  loadModules(opts)

  const notifier = updateNotifier({
    pkg: {
      name: 'fastify',
      version: fastifyPackageJSON.version
    },
    updateCheckInterval: 1000 * 60 * 60 * 24 * 7 // 1 week
  })

  notifier.notify({
    isGlobal: false,
    defer: false
  })

  return runFastify(opts)
}

function stop (error) {
  if (error) {
    console.log(error)
    process.exit(1)
  }
  process.exit()
}

function runFastify (opts) {
  opts = Object.assign(readEnv(), opts)
  opts.port = opts.port || 3000
  opts['log-level'] = opts['log-level'] || 'fatal'

  loadModules(opts)

  var file = null
  try {
    file = require(path.resolve(process.cwd(), opts._[0]))
  } catch (e) {
    return module.exports.stop(e)
  }

  if (file.length !== 3 && file.constructor.name === 'Function') {
    return module.exports.stop(new Error('Plugin function should contain 3 arguments. Refer to ' +
                    'documentation for more information.'))
  }
  if (file.length !== 2 && file.constructor.name === 'AsyncFunction') {
    return module.exports.stop(new Error('Async/Await plugin function should contain 2 arguments.' +
    'Refer to documentation for more information.'))
  }

  const options = {
    logger: {
      level: opts['log-level']
    }
  }

  if (opts['body-limit']) {
    options.bodyLimit = opts['body-limit']
  }

  if (opts['pretty-logs']) {
    const pinoColada = PinoColada()
    options.logger.stream = pinoColada
    pump(pinoColada, process.stdout, assert.ifError)
  }

  const fastify = Fastify(opts.options ? Object.assign(options, file.options) : options)

  const pluginOptions = {}
  if (opts.prefix) {
    pluginOptions.prefix = opts.prefix
    fastify._routePrefix = opts.prefix || ''
  }

  fastify.register(fp(file), pluginOptions)

  if (opts.address) {
    fastify.listen(opts.port, opts.address, assert.ifError)
  } else if (opts.socket) {
    fastify.listen(opts.socket, assert.ifError)
  } else {
    fastify.listen(opts.port, assert.ifError)
  }

  return fastify
}

function cli (args) {
  start(minimist(args, {
    integer: ['port', 'body-limit'],
    boolean: ['pretty-logs', 'options'],
    string: ['log-level', 'address'],
    alias: {
      port: 'p',
      socket: 's',
      help: 'h',
      options: 'o',
      address: 'a',
      prefix: 'r',
      'log-level': 'l',
      'pretty-logs': 'P'
    }
  }))
}

function readEnv () {
  require('dotenv').config()

  const env = process.env
  const opts = {}

  if (env.FASTIFY_PORT) opts.port = env.FASTIFY_PORT
  if (env.FASTIFY_SOCKET) opts.socket = env.FASTIFY_SOCKET
  if (env.FASTIFY_OPTIONS) opts.options = env.FASTIFY_OPTIONS
  if (env.FASTIFY_ADDRESS) opts.address = env.FASTIFY_ADDRESS
  if (env.FASTIFY_PREFIX) opts.prefix = env.FASTIFY_PREFIX
  if (env.FASTIFY_LOG_LEVEL) opts['log-level'] = env.FASTIFY_LOG_LEVEL
  if (env.FASTIFY_PRETTY_LOGS) opts['pretty-logs'] = env.FASTIFY_PRETTY_LOGS
  if (env.FASTIFY_BODY_LIMIT) opts['body-limit'] = env.FASTIFY_BODY_LIMIT

  return opts
}

module.exports = { start, stop, runFastify, cli }

if (require.main === module) {
  cli(process.argv.slice(2))
}
