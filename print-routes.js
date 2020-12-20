#! /usr/bin/env node

'use strict'

const parseArgs = require('./args')
const log = require('./log')
const {
  exit,
  requireFastifyForModule,
  requireServerPluginFromPath,
  showHelpForCommand
} = require('./util')

let Fastify = null

function loadModules (opts) {
  try {
    Fastify = requireFastifyForModule(opts._[0]).module
  } catch (e) {
    module.exports.stop(e)
  }
}

function printRoutes (args) {
  const opts = parseArgs(args)
  if (opts.help) {
    return showHelpForCommand('print-routes')
  }

  if (opts._.length !== 1) {
    console.error('Missing the required file parameter\n')
    return showHelpForCommand('print-routes')
  }

  // we start crashing on unhandledRejection
  require('make-promises-safe')

  loadModules(opts)

  return runFastify(opts)
}

async function runFastify (opts) {
  require('dotenv').config()

  let file = null

  try {
    file = await requireServerPluginFromPath(opts._[0])
  } catch (e) {
    return module.exports.stop(e)
  }

  const fastify = Fastify(opts.options)

  const pluginOptions = {}
  if (opts.prefix) {
    pluginOptions.prefix = opts.prefix
  }

  await fastify.register(file, pluginOptions)
  await fastify.ready()
  log('debug', fastify.printRoutes())

  return fastify
}

function stop (message) {
  exit(message)
}

function cli (args) {
  return printRoutes(args).then(fastify => {
    if (fastify) return fastify.close()
  })
}

module.exports = { cli, stop, printRoutes }

if (require.main === module) {
  cli(process.argv.slice(2))
}
