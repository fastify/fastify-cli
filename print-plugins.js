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

function printPlugins (args) {
  const opts = parseArgs(args)
  if (opts.help) {
    return showHelpForCommand('print-plugins')
  }

  if (opts._.length !== 1) {
    console.error('Missing the required file parameter\n')
    return showHelpForCommand('print-plugins')
  }

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
  log('debug', fastify.printPlugins())

  return fastify
}

function stop (message) {
  exit(message)
}

function cli (args) {
  return printPlugins(args).then(fastify => {
    if (fastify) return fastify.close()
  })
}

module.exports = { cli, stop, printPlugins }

if (require.main === module) {
  cli(process.argv.slice(2))
}
