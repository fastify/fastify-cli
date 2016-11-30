#! /usr/bin/env node

'use strict'

const minimist = require('minimist')
const Fastify = require('fastify')
const path = require('path')
const fs = require('fs')
const help = fs.readFileSync(path.join(__dirname, 'help.txt'), 'utf8')

function start (opts) {
  if (opts.help) {
    console.log(help)
    process.exit(0)
  }

  if (opts._.length !== 1) {
    console.log('Missing the file parameter')
    process.exit(1)
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
    process.exit(1)
  }

  const fastify = Fastify({
    logger: {
      level: opts['log-level']
    }
  })

  fastify.register(file, function (err) {
    if (err) {
      console.log(err)
      process.exit(1)
    }
  })

  fastify.listen(opts.port, function (err) {
    if (err) {
      console.log(err)
      process.exit(1)
    }
    console.log(`Server listening on http://localhost:${fastify.server.address().port}`)
  })
}

if (require.main === module) {
  start(minimist(process.argv.slice(2), {
    integer: ['port'],
    string: ['log-level'],
    alias: {
      port: 'p',
      help: 'h'
    },
    default: {
      port: 3000,
      'log-level': 'fatal'
    }
  }))
}

module.exports = { start, stop, runFastify }
