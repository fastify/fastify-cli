#! /usr/bin/env node

'use strict'

require('dotenv').config()

const assert = require('assert')
const path = require('path')
const split = require('split2')
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
    const app = opts._[0]
    const { module: fastifyModule } = requireFastifyForModule(app)

    Fastify = fastifyModule
  } catch (e) {
    module.exports.stop(e)
  }
}

async function start (args) {
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

  if (path.extname(opts._[0]) === '.ts') {
    return require('./lib/watch/tsc-watcher')(args, opts)
  }

  loadModules(opts)

  if (opts.watch) {
    return watch(args, opts.ignoreWatch)
  }

  return runFastify(args)
}

function stop (message) {
  exit(message)
}

async function runFastify (args) {
  const opts = parseArgs(args)
  opts.port = opts.port || process.env.PORT || 3000

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
    const stream = split(PinoColada())
    options.logger.stream = stream
    pump(stream, process.stdout, assert.ifError)
  }

  if (opts.debug) {
    if (process.version.match(/v[0-6]\..*/g)) {
      stop('Fastify debug mode not compatible with Node.js version < 6')
    } else {
      require('inspector').open(opts.debugPort, opts.debugHost || isDocker() ? listenAddressDocker : undefined)
    }
  }

  const fastify = Fastify(opts.options ? Object.assign(options, file.options) : options)

  if (opts.prefix) {
    opts.pluginOptions.prefix = opts.prefix
  }

  await fastify.register(file.default || file, opts.pluginOptions)

  if (opts.address) {
    await fastify.listen(opts.port, opts.address)
  } else if (opts.socket) {
    await fastify.listen(opts.socket)
  } else if (isDocker()) {
    await fastify.listen(opts.port, listenAddressDocker)
  } else {
    await fastify.listen(opts.port)
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
