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
const fp = require('fastify-plugin')

let Fastify = null

function loadModules (opts) {
  try {
    Fastify = requireFastifyForModule(opts._[0]).module
  } catch (e) {
    module.exports.stop(e)
  }
}

async function generateSwagger (args) {
  const opts = parseArgs(args)
  if (opts.help) {
    return showHelpForCommand('generate-swagger')
  }

  if (opts._.length !== 1) {
    console.error('Missing the required file parameter\n')
    return showHelpForCommand('generate-swagger')
  }

  // we start crashing on unhandledRejection
  require('make-promises-safe')

  loadModules(opts)

  const fastify = await runFastify(opts)
  try {
    if (fastify.swagger == null) {
      log('error', '@fastify/swagger plugin not installed')
      process.exit(1)
    }

    return JSON.stringify(fastify.swagger(), undefined, 2)
  } finally {
    fastify.close()
  }
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

  await fastify.register(fp(file), pluginOptions)
  await fastify.ready()

  return fastify
}

function stop (message) {
  exit(message)
}

function cli (args) {
  return generateSwagger(args).then(swagger => {
    process.stdout.write(swagger + '\n')
  })
}

module.exports = { cli, stop, generateSwagger }

if (require.main === module) {
  cli(process.argv.slice(2))
}
