#! /usr/bin/env node

'use strict'

require('dotenv').config()

const assert = require('assert')
const path = require('path')
const fs = require('fs')
const resolveFrom = require('resolve-from')
const parseArgs = require('./args')
const log = require('./log')

let Fastify = null

function loadModules (opts) {
  try {
    const basedir = path.resolve(process.cwd(), opts._[0])

    Fastify = require(resolveFrom.silent(basedir, 'fastify') || 'fastify')
  } catch (e) {
    module.exports.stop(e)
  }
}

function showHelp () {
  console.log(fs.readFileSync(path.join(__dirname, 'help', 'print-routes.txt'), 'utf8'))
  return module.exports.stop()
}

function printRoutes (args, cb) {
  const opts = parseArgs(args)
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

  return runFastify(opts, cb)
}

function runFastify (opts, cb) {
  const filePath = path.resolve(process.cwd(), opts._[0])
  cb = cb || assert.ifError

  if (!fs.existsSync(filePath)) {
    return module.exports.stop(`${opts._[0]} doesn't exist within ${process.cwd()}`)
  }

  let file = null

  try {
    file = require(filePath)
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

  const fastify = Fastify(opts.options)

  const pluginOptions = {}
  if (opts.prefix) {
    pluginOptions.prefix = opts.prefix
  }

  fastify
    .register(file, pluginOptions)
    .ready((err) => {
      if (err) {
        return cb(err, fastify)
      }

      log('debug', fastify.printRoutes())

      cb(null, fastify)
    })

  return fastify
}

function stop (message) {
  if (message instanceof Error) {
    console.log(message)
    process.exit(1)
  } else if (message) {
    console.log(`Warn: ${message}`)
    process.exit(1)
  }
  process.exit()
}

function cli (args) {
  printRoutes(args)
}

module.exports = { cli, stop, printRoutes }

if (require.main === module) {
  cli(process.argv.slice(2))
}
