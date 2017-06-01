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
    stop(0)
  }

  assert(opts._.length === 1, 'Missing the file parameter')

  runFastify(opts)
}

function stop (code) {
  process.exit(code)
}

function runFastify (opts) {
  var file = null
  try {
    file = require(path.resolve(process.cwd(), opts._[0]))
  } catch (e) {
    console.log(`Cannot find the specified file: '${opts._[0]}'`)
    stop(1)
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

  fastify.register(file, assert.ifError)

  if (opts.address) {
    fastify.listen(opts.port, opts.address, listen)
  } else {
    fastify.listen(opts.port, listen)
  }

  function listen (err) {
    assert.ifError(err)
    console.log(`Server listening on http://localhost:${fastify.server.address().port}`)
  }
}

function cli () {
  start(minimist(process.argv.slice(2), {
    integer: ['port'],
    boolean: ['pretty-logs', 'options'],
    string: ['log-level', 'address'],
    alias: {
      port: 'p',
      help: 'h',
      options: 'o',
      address: 'a',
      'log-level': 'l',
      'pretty-logs': 'P'
    },
    default: {
      port: 3000,
      'log-level': 'fatal'
    }
  }))
}

if (require.main === module) {
  cli()
}

module.exports = { start, stop, runFastify, cli }
