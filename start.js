#! /usr/bin/env node

'use strict'

require('dotenv').config()
const isDocker = require('is-docker')
const closeWithGrace = require('close-with-grace')
const listenAddressDocker = '0.0.0.0'
const watch = require('./lib/watch')
const parseArgs = require('./args')
const {
  exit,
  requireModule,
  requireFastifyForModule,
  requireServerPluginFromPath,
  showHelpForCommand
} = require('./util')

let Fastify = null

function loadModules (opts) {
  try {
    const { module: fastifyModule } = requireFastifyForModule(opts._[0])

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

  loadModules(opts)

  if (opts.watch) {
    return watch(args, opts.ignoreWatch, opts.verboseWatch)
  }

  return runFastify(args)
}

function stop (message) {
  exit(message)
}

async function runFastify (args, additionalOptions) {
  const opts = parseArgs(args)
  if (opts.require) {
    if (typeof opts.require === 'string') {
      opts.require = [opts.require]
    }

    try {
      opts.require.forEach(module => {
        if (module) {
          /* This check ensures we ignore `-r ""`, trailing `-r`, or
           * other silly things the user might (inadvertently) be doing.
           */
          requireModule(module)
        }
      })
    } catch (e) {
      module.exports.stop(e)
    }
  }
  opts.port = opts.port || process.env.PORT || 3000

  loadModules(opts)

  let file = null

  try {
    file = await requireServerPluginFromPath(opts._[0])
  } catch (e) {
    return module.exports.stop(e)
  }

  let logger
  if (opts.loggingModule) {
    try {
      logger = requireModule(opts.loggingModule)
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
    options.logger.transport = {
      target: 'pino-pretty'
    }
  }

  if (opts.debug) {
    if (process.version.match(/v[0-6]\..*/g)) {
      stop('Fastify debug mode not compatible with Node.js version < 6')
    } else {
      require('inspector').open(
        opts.debugPort,
        opts.debugHost || isDocker() ? listenAddressDocker : undefined
      )
    }
  }

  const fastify = Fastify(
    opts.options ? Object.assign(options, file.options) : options
  )

  if (opts.prefix) {
    opts.pluginOptions.prefix = opts.prefix
  }

  const appConfig = Object.assign({}, opts.pluginOptions, additionalOptions)
  await fastify.register(file.default || file, appConfig)

  const closeListeners = closeWithGrace({ delay: 500 }, async function ({ signal, err, manual }) {
    if (err) {
      fastify.log.error(err)
    }
    await fastify.close()
  })

  await fastify.addHook('onClose', (instance, done) => {
    closeListeners.uninstall()
    done()
  })

  if (additionalOptions && additionalOptions.ready) {
    await fastify.ready()
  } else if (opts.address) {
    await fastify.listen({ port: opts.port, host: opts.address })
  } else if (opts.socket) {
    await fastify.listen({ path: opts.socket })
  } else if (isDocker()) {
    await fastify.listen({ port: opts.port, host: listenAddressDocker })
  } else {
    await fastify.listen({ port: opts.port })
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
