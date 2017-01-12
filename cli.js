#! /usr/bin/env node

'use strict'

const minimist = require('minimist')
const Fastify = require('fastify')
const path = require('path')
const pino = require('pino')
const pump = require('pump')
const fs = require('fs')

function start (opts) {
  if (opts.help) {
    console.log(fs.readFileSync(path.join(__dirname, 'help.txt'), 'utf8'))
    stop(0)
  }

  if (opts._.length !== 1) {
    console.log('Missing the file parameter')
    stop(1)
  }

  runFastify(opts)
}

function stop (code) {
  process.exit(code)
}

function runFastify (opts) {
  let file = null
  try {
    file = require(path.resolve(process.cwd(), opts._[0]))
  } catch (e) {
    console.log('Cannot find the specified file')
    stop(1)
  }

  const options = {
    logger: {
      level: opts['log-level']
    }
  }

  if (opts['pretty-logs']) {
    const pretty = pino.pretty()
    pump(pretty, process.stdout, err => {
      if (err) {
        console.log(err)
        stop(1)
      }
    })
    options.logger.stream = pretty
  }

  const fastify = Fastify(opts.options ? Object.assign(options, file.options) : options)

  fastify.register(file, function (err) {
    if (err) {
      console.log(err)
      stop(1)
    }
  })

  fastify.listen(opts.port, function (err) {
    if (err) {
      console.log(err)
      stop(1)
    }
    console.log(`Server listening on http://localhost:${fastify.server.address().port}`)
  })
}

if (require.main === module) {
  start(minimist(process.argv.slice(2), {
    integer: ['port'],
    boolean: ['pretty-logs', 'options'],
    string: ['log-level'],
    alias: {
      port: 'p',
      help: 'h',
      options: 'o',
      'log-level': 'l',
      'pretty-logs': 'P'
    },
    default: {
      port: 3000,
      'log-level': 'fatal'
    }
  }))
}

module.exports = { start, stop, runFastify }
