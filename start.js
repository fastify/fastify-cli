#! /usr/bin/env node

'use strict'

const path = require('path')
const fs = require('fs')
const assert = require('assert')
const cp = require('child_process')
const chokidar = require('chokidar')
const forkPath = path.join(__dirname, './fork.js')

const updateNotifier = require('update-notifier')
const minimist = require('minimist')
const PinoColada = require('pino-colada')
const pump = require('pump')
const resolveFrom = require('resolve-from')
const fp = require('fastify-plugin')
const isDocker = require('is-docker')
const listenAddressDocker = '0.0.0.0'
const EventEmitter = require('events')

let childs = []
let Fastify = null
let fastifyPackageJSON = null

function loadModules (opts) {
  try {
    const basedir = path.resolve(process.cwd(), opts._[0])

    Fastify = require(resolveFrom.silent(basedir, 'fastify') || 'fastify')
    fastifyPackageJSON = require(resolveFrom.silent(basedir, 'fastify/package.json') || 'fastify/package.json')
  } catch (e) {
    module.exports.stop(e)
  }
}

function showHelp () {
  console.log(fs.readFileSync(path.join(__dirname, 'help', 'start.txt'), 'utf8'))
  return module.exports.stop()
}

function start (args) {
  let opts = minimistArgs(args)
  if (opts.help) {
    return showHelp()
  }

  if (opts._.length !== 1) {
    console.error('Error: Missing the required file parameter\n')
    return showHelp()
  }

  loadModules(opts)

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

  if (opts['watch']) {
    const emitter = new EventEmitter()
    setTimeout(function () {
      const run = (event) => {
        const child = cp.fork(forkPath, args, {
          env: process.env,
          cwd: process.cwd(),
          encoding: 'utf8'
        })

        child.on('message', (childEvent) => {
          const { type, err } = childEvent
          if (err) {
            emitter.emit('error', err)
          }
          emitter.emit(event)
          setTimeout(function () {
            emitter.emit(type)
          }, 100)
        })

        child.on('close', (code, signal) => {
          if (signal === 'SIGUSR2') { childs.push(run('restart')) }
        })

        return child
      }

      const watcher = chokidar.watch(process.cwd(), { ignored: /(node_modules|\.git|bower_components|build|dist)/ })
      watcher.on('ready', function () {
        watcher.on('all', function (e) {
          restart(e)
        })
      })

      childs.push(run('start'))

      const restart = (e) => {
        emitter.emit('watch:debug', `can you trigger me(${e}) in tarvis-ci? touch.sync(tmpjs)!`)
        childs.shift().kill('SIGUSR2')
      }

      emitter.on('error', (err) => {
        childs.shift().kill('SIGINT')
        throw err
      })

      emitter.on('close', () => {
        childs.shift().kill('SIGINT')
        watcher.close()
      })
    }, 100)

    return emitter
  }

  return runFastify(args)
}

function stop (error) {
  if (error) {
    console.log(error)
    process.exit(1)
  }
  process.exit()
}

function minimistArgs (args) {
  return minimist(args, {
    integer: ['port', 'body-limit'],
    boolean: ['pretty-logs', 'options', 'watch'],
    string: ['log-level', 'address'],
    alias: {
      port: 'p',
      socket: 's',
      help: 'h',
      options: 'o',
      address: 'a',
      watch: 'w',
      prefix: 'r',
      'log-level': 'l',
      'pretty-logs': 'P'
    }
  })
}

function runFastify (args) {
  let opts = minimistArgs(args)
  opts = Object.assign(readEnv(), opts)
  opts.port = opts.port || 3000
  opts['log-level'] = opts['log-level'] || 'fatal'

  loadModules(opts)

  var file = null
  try {
    file = require(path.resolve(process.cwd(), opts._[0]))
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

  const options = {
    logger: {
      level: opts['log-level']
    }
  }

  if (opts['body-limit']) {
    options.bodyLimit = opts['body-limit']
  }

  if (opts['pretty-logs']) {
    const pinoColada = PinoColada()
    options.logger.stream = pinoColada
    pump(pinoColada, process.stdout, assert.ifError)
  }

  const fastify = Fastify(opts.options ? Object.assign(options, file.options) : options)

  const pluginOptions = {}
  if (opts.prefix) {
    pluginOptions.prefix = opts.prefix
    fastify._routePrefix = opts.prefix || ''
  }

  fastify.register(fp(file), pluginOptions)

  if (opts.address) {
    fastify.listen(opts.port, opts.address, assert.ifError)
  } else if (opts.socket) {
    fastify.listen(opts.socket, assert.ifError)
  } else if (isDocker()) {
    fastify.listen(opts.port, listenAddressDocker, assert.ifError)
  } else {
    fastify.listen(opts.port, assert.ifError)
  }

  return fastify
}

function cli (args) {
  start(args)
}

function readEnv () {
  require('dotenv').config()

  const env = process.env
  const opts = {}

  if (env.FASTIFY_PORT || env.PORT) opts.port = env.FASTIFY_PORT || env.PORT
  if (env.FASTIFY_SOCKET) opts.socket = env.FASTIFY_SOCKET
  if (env.FASTIFY_OPTIONS) opts.options = env.FASTIFY_OPTIONS
  if (env.FASTIFY_ADDRESS) opts.address = env.FASTIFY_ADDRESS
  if (env.FASTIFY_WATCH) opts['watch'] = env.FASTIFY_WATCH
  if (env.FASTIFY_PREFIX) opts.prefix = env.FASTIFY_PREFIX
  if (env.FASTIFY_LOG_LEVEL) opts['log-level'] = env.FASTIFY_LOG_LEVEL
  if (env.FASTIFY_PRETTY_LOGS) opts['pretty-logs'] = env.FASTIFY_PRETTY_LOGS
  if (env.FASTIFY_BODY_LIMIT) opts['body-limit'] = env.FASTIFY_BODY_LIMIT

  return opts
}

module.exports = { start, stop, runFastify, cli }

if (require.main === module) {
  cli(process.argv.slice(2))
}
