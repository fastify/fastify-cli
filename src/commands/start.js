'use strict'

const assert = require('assert')
const { Command, flags } = require('@oclif/command')
const PinoColada = require('pino-colada')
const pump = require('pump')
const updateNotifier = require('update-notifier')
const isDocker = require('is-docker')
const { exit, requireFastifyForModule, requireServerPluginFromPath } = require('../../util')
const watch = require('../../lib/watch')

const listenAddressDocker = '0.0.0.0'
let Fastify = null
let fastifyPackageJSON = null

class Start extends Command {
  loadModules (file) {
    try {
      const { module: fastifyModule, pkg: fastifyPkg } = requireFastifyForModule(file)

      Fastify = fastifyModule
      fastifyPackageJSON = fastifyPkg
    } catch (e) {
      this.stop(e)
    }
  }

  stop (message) {
    exit(message)
  }

  runFastify (argv, flags) {
    const cb = assert.ifError
    flags.port = flags.port || process.env.PORT || 3000

    this.loadModules(argv[0])

    let file = null

    try {
      file = requireServerPluginFromPath(argv[0])
    } catch (e) {
      return this.stop(e)
    }

    const options = {
      logger: {
        level: flags['log-level']
      },

      pluginTimeout: flags.pluginTimeout
    }

    if (flags['body-limit']) {
      options.bodyLimit = flags['body-limit']
    }

    if (flags['pretty-logs']) {
      const pinoColada = PinoColada()
      options.logger.stream = pinoColada
      pump(pinoColada, process.stdout, assert.ifError)
    }

    const fastify = Fastify(flags.options ? Object.assign(options, file.options) : options)

    const pluginOptions = {}
    if (flags.prefix) {
      pluginOptions.prefix = flags.prefix
    }

    fastify.register(file, pluginOptions)

    if (flags.address) {
      fastify.listen(flags.port, flags.address, wrap)
    } else if (flags.socket) {
      fastify.listen(flags.socket, wrap)
    } else if (isDocker()) {
      fastify.listen(flags.port, listenAddressDocker, wrap)
    } else {
      fastify.listen(flags.port, wrap)
    }

    function wrap (err) {
      cb(err, fastify)
    }

    return fastify
  }

  async run () {
    const { argv } = this.parse(Start)
    const { flags } = this.parse(Start)

    if (!argv[0]) {
      console.error('Missing the required file parameter\n')
      this.exit(1)
    }

    require('make-promises-safe')

    this.loadModules(argv[0])

    const notifier = updateNotifier({
      pkg: {
        name: 'fastify',
        version: fastifyPackageJSON.version
      },
      updateCheckInterval: 1000 * 60 * 60 * 24 * 7 // 1 week
    })

    notifier.notify({
      isGlobal: false,
      defer: false
    })

    if (flags.watch) {
      return watch(argv, flags['ignore-watch'])
    }

    this.runFastify(argv, flags)
  }
}

Start.description = 'start a server'
Start.args = [{
  name: 'file',
  required: true,
  description: 'server start main file'

}]
Start.flags = {
  port: flags.integer({
    char: 'p',
    description: 'Port to listen on (default to 3000)',
    multiple: false,
    default: 3000
  }),
  address: flags.string({
    char: 'a',
    description: 'Address to listen on'
  }),
  socket: flags.string({
    char: 's',
    description: 'Socket to listen on'
  }),
  'log-level': flags.string({
    char: 'l',
    description: 'Log level (default to fatal)',
    default: 'fatal'
  }),
  'pretty-logs': flags.boolean({
    char: 'P',
    description: 'Prints pretty logs',
    default: false
  }),
  'plugin-timeout': flags.integer({
    char: 'T',
    description: 'The maximum amount of time that a plugin can take to load (default to 10 seconds).',
    multiple: false,
    default: 10 * 1000
  }),
  options: flags.boolean({
    char: 'o',
    description: 'Use custom options'
  }),
  watch: flags.boolean({
    char: 'w',
    description: 'Watch process.cwd() directory for changes, recursively; when that happens, the process will auto reload.',
    default: false
  }),
  'ignore-watch': flags.string({
    description: 'ingore watch files',
    default: 'node_modules build dist .git bower_components logs'
  }),
  prefix: flags.string({
    char: 'r',
    description: 'Set the prefix'
  }),
  'body-limit': flags.string({
    description: 'Defines the maximum payload, in bytes, the server is allowed to accept'
  })
}

module.exports = Start
