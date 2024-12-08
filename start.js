#! /usr/bin/env node

'use strict'

require('dotenv').config()
const isDocker = require('is-docker')
const closeWithGrace = require('close-with-grace')
const deepmerge = require('@fastify/deepmerge')({
  cloneProtoObject (obj) { return obj }
})

const listenAddressDocker = '0.0.0.0'
const watch = require('./lib/watch')
const parseArgs = require('./args')
const {
  exit,
  requireModule,
  requireESModule,
  requireModuleDefaultExport,
  requireFastifyForModule,
  requireServerPluginFromPath,
  showHelpForCommand,
  isKubernetes
} = require('./util')
const fp = require('fastify-plugin')

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

  loadModules(opts)

  if (opts.watch) {
    return watch(args, opts.ignoreWatch, opts.verboseWatch)
  }

  return runFastify(args)
}

function stop (message) {
  exit(message)
}

function preloadCJSModules (opts) {
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

async function preloadESModules (opts) {
  if (typeof opts.import === 'string') {
    opts.import = [opts.import]
  }
  opts.import.forEach(async (m) => {
    if (m) {
      /* This check ensures we ignore `-i ""`, trailing `-i`, or
       * other silly things the user might (inadvertently) be doing.
       */
      try {
        await requireESModule(m)
      } catch (e) {
        module.exports.stop(e)
      }
    }
  })
}

async function runFastify (args, additionalOptions, serverOptions) {
  const opts = parseArgs(args)

  if (opts.require) {
    preloadCJSModules(opts)
  }
  if (opts.import) {
    await preloadESModules(opts)
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
      logger = await requireModuleDefaultExport(opts.loggingModule)
    } catch (e) {
      module.exports.stop(e)
    }
  }

  const defaultLogger = {
    level: opts.logLevel
  }
  let options = {
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
      require('node:inspector').open(
        opts.debugPort,
        opts.debugHost || isDocker() || isKubernetes() ? listenAddressDocker : undefined
      )
    }
  }

  if (serverOptions) {
    options = deepmerge(options, serverOptions)
  }

  if (opts.options && file.options) {
    options = deepmerge(options, file.options)
  }

  if (opts.trustProxy) {
    options.trustProxy = opts.trustProxy
  }

  const fastify = Fastify(options)

  if (opts.prefix) {
    opts.pluginOptions.prefix = opts.prefix
  }

  const appConfig = Object.assign({}, opts.options ? file.options : {}, opts.pluginOptions, additionalOptions)

  const appFn = file.default || file
  const appPlugin = appConfig.skipOverride ? fp(appFn) : appFn
  await fastify.register(appPlugin, appConfig)

  const closeListeners = closeWithGrace({ delay: opts.closeGraceDelay }, async function ({ signal, err, manual }) {
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
  } else if (isDocker() || isKubernetes()) {
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
