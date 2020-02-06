#! /usr/bin/env node

'use strict'

require('dotenv').config()

const assert = require('assert')
const path = require('path')

const PinoColada = require('pino-colada')
const pump = require('pump')
const isDocker = require('is-docker')
const listenAddressDocker = '0.0.0.0'
const watch = require('./lib/watch')
const parseArgs = require('./args')
const { exit, requireFastifyForModule, requireServerPluginFromPath, showHelpForCommand } = require('./util')

let Fastify = null

function loadModules (opts) {
  try {
    const { module: fastifyModule } = requireFastifyForModule(opts._[0])

    Fastify = fastifyModule
  } catch (e) {
    module.exports.stop(e)
  }
}

function start (args, cb) {
  const opts = parseArgs(args)
  if (opts.help) {
    return showHelpForCommand('start')
  }

  if (opts._.length !== 1) {
    console.error('Missing the required file parameter\n')
    return showHelpForCommand('start')
  }

  // we start crashing on unhandledRejection
  require('make-promises-safe')

  loadModules(opts)

  if (opts.watch) {
    return watch(args, opts.ignoreWatch)
  }

  return runFastify(args, cb)
}

function stop (message) {
  exit(message)
}

function runFastify (args, cb) {
  const opts = parseArgs(args)
  opts.port = opts.port || process.env.PORT || 3000
  cb = cb || assert.ifError

  loadModules(opts)

  let file = null

  try {
    file = requireServerPluginFromPath(opts._[0])
  } catch (e) {
    return module.exports.stop(e)
  }

  let logger
  if (opts.loggingModule) {
    try {
      const moduleFilePath = path.resolve(opts.loggingModule)
      const moduleFileExtension = path.extname(opts.loggingModule)
      const modulePath = moduleFilePath.split(moduleFileExtension)[0]

      logger = require(modulePath)
    } catch (e) {
      module.exports.stop(e)
    }
  }

  const defaultLogger = {
    level: opts.logLevel
  }
  const options = {
    logger: logger || defaultLogger,

    pluginTimeout: opts.pluginTimeout
  }

  if (opts.bodyLimit) {
    options.bodyLimit = opts.bodyLimit
  }

  if (opts.prettyLogs) {
    const pinoColada = PinoColada()
    options.logger.stream = pinoColada
    pump(pinoColada, process.stdout, assert.ifError)
  }

  if (opts.debug) {
    if (process.version.match(/v[0-6]\..*/g)) {
      stop('Fastify debug mode not compatible with Node.js version < 6')
    } else {
      require('inspector').open(opts.debugPort)
    }
  }

  const fastify = Fastify(opts.options ? Object.assign(options, file.options) : options)

  const pluginOptions = {}
  if (opts.prefix) {
    pluginOptions.prefix = opts.prefix
  }

  fastify.register(file, pluginOptions)

  if (opts.address) {
    fastify.listen(opts.port, opts.address, wrap)
  } else if (opts.socket) {
    fastify.listen(opts.socket, wrap)
  } else if (isDocker()) {
    fastify.listen(opts.port, listenAddressDocker, wrap)
  } else {
    fastify.listen(opts.port, wrap)
  }

  function wrap (err) {
    cb(err, fastify)
  }

  return fastify
}

function cli (args) {
  start(args)
}

module.exports = { start, stop, runFastify, cli }

if (require.main === module) {
  cli(process.argv.slice(2))
}
