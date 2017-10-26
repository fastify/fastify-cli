#! /usr/bin/env node

'use strict'

const path = require('path')
const fs = require('fs')
const assert = require('assert')

const updateNotifier = require('update-notifier')
const minimist = require('minimist')
const PinoColada = require('pino-colada')
const pump = require('pump')
const Fastify = require('fastify')

function start (opts) {
  const notifier = updateNotifier({
    pkg: {
      name: 'fastify',
      version: require('fastify/package.json').version
    },
    updateCheckInterval: 1000 * 60 * 60 * 24 * 7 // 1 week
  })

  notifier.notify({
    isGlobal: false,
    defer: false
  })

  if (opts.help) {
    console.log(fs.readFileSync(path.join(__dirname, 'help.txt'), 'utf8'))
    return module.exports.stop()
  }

  assert(opts._.length === 1, 'Missing the file parameter')

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
  var file = null
  try {
    file = require(path.resolve(process.cwd(), opts._[0]))
  } catch (e) {
    return module.exports.stop(e)
  }

  console.log(file.constructor.name)

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

  if (opts['pretty-logs']) {
    const pinoColada = PinoColada()
    options.logger.stream = pinoColada
    pump(pinoColada, process.stdout, assert.ifError)
  }

  const fastify = Fastify(opts.options ? Object.assign(options, file.options) : options)

  const pluginOptions = {}
  if (opts.prefix) {
    pluginOptions.prefix = opts.prefix
  }

  fastify.register(file, pluginOptions, assert.ifError)

  if (opts.address) {
    fastify.listen(opts.port, opts.address, listen)
  } else if (opts.socket) {
    fastify.listen(opts.socket, listen)
  } else {
    fastify.listen(opts.port, listen)
  }

  function listen (err) {
    assert.ifError(err)
    let address = fastify.server.address()
    if (typeof address === 'object') {
      address = `http://localhost:${fastify.server.address().port}`
    }
    console.log(`Server listening on ${address}`)
  }

  return fastify
}

function cli () {
  start(minimist(process.argv.slice(2), {
    integer: ['port'],
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
    },
    default: {
      port: 3000,
      'log-level': 'fatal'
    }
  }))
}

module.exports = { start, stop, runFastify, cli }

if (require.main === module) {
  cli()
}
