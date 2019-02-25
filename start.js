#! /usr/bin/env node

'use strict'

require('dotenv').config()

const path = require('path')
const fs = require('fs')
const assert = require('assert')
const updateNotifier = require('update-notifier')
const PinoColada = require('pino-colada')
const pump = require('pump')
const resolveFrom = require('resolve-from')
const isDocker = require('is-docker')
const listenAddressDocker = '0.0.0.0'
const watch = require('./lib/watch')
const parseArgs = require('./args')

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

function start (args, cb) {
  let opts = parseArgs(args)
  if (opts.help) {
    return showHelp()
  }

  if (opts._.length !== 1) {
    console.error('Missing the required file parameter\n')
    return showHelp()
  }

  // we start crashing on unhandledRejection
  require('make-promises-safe')

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

  if (opts.watch) {
    return watch(args, opts.ignoreWatch)
  }

  return runFastify(args, cb)
}

function stop (error) {
  if (error) {
    console.log(error)
    process.exit(1)
  }
  process.exit()
}

function runFastify (args, cb) {
  let opts = parseArgs(args)
  opts.port = opts.port || process.env.PORT || 3000
  cb = cb || assert.ifError

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
      level: opts.logLevel
    },

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
