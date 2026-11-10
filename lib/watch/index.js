'use strict'

const path = require('node:path')
const cp = require('node:child_process')
const chalk = require('chalk').default
const { arrayToRegExp, logWatchVerbose } = require('./utils')
const { GRACEFUL_SHUT } = require('./constants.js')

const EventEmitter = require('node:events')
const chokidar = require('chokidar')
const { loadEnvQuitely } = require('../../env-loader.js')
const forkPath = path.join(__dirname, './fork.js')

const watch = function (args, ignoreWatch, verboseWatch, followWatch, onWatch) {
  const emitter = new EventEmitter()
  let allStop = false
  let childs = []
  // The running on-watch command, if any
  let onWatchProc = null
  const stop = (watcher = null, err = null) => {
    childs.forEach(function (child) {
      child.kill()
    })

    childs = []
    if (err) {
      console.log(chalk.red(err))
    }
    if (watcher) {
      allStop = true
      if (onWatchProc) {
        onWatchProc.kill()
      }
      return watcher.close()
    }
  }

  process.on('uncaughtException', () => {
    stop()
    childs.push(run('restart'))
  })

  let readyEmitted = false

  const run = (event) => {
    const childEvent = { childEvent: event }
    loadEnvQuitely()
    const env = Object.assign({}, process.env, childEvent)
    const _child = cp.fork(forkPath, args, {
      env,
      cwd: process.cwd(),
      encoding: 'utf8'
    })

    _child.on('exit', function (code, signal) {
      if (childs.length === 0 && !allStop) {
        childs.push(run('restart'))
      }
      return null
    })

    _child.on('message', (event) => {
      const { type, err } = event
      if (err) {
        emitter.emit('error', err)
        return null
      }

      if (type === 'ready') {
        if (readyEmitted) {
          return
        }

        readyEmitted = true
      }

      emitter.emit(type, err)
    })

    return _child
  }

  childs.push(run('start'))
  const ignoredArr = ignoreWatch.split(' ').map((item) => item.trim()).filter((item) => item.length)

  const ignoredPattern = arrayToRegExp(ignoredArr)
  const watchDir = followWatch || process.cwd()
  const watcher = chokidar.watch(watchDir, { ignored: ignoredPattern })
  const restart = () => {
    try {
      const child = childs.shift()
      child.send(GRACEFUL_SHUT)
    } catch (err) {
      // the previous child already exited: start a new one
      childs.push(run('restart'))
    }
  }
  watcher.on('ready', function () {
    watcher.on('all', function (event, filepath) {
      if (verboseWatch) {
        logWatchVerbose(event, filepath)
      }
      if (!onWatch) {
        return restart()
      }
      // Changes made while the command runs are picked up by the restart that
      // follows it, so they don't start another run.
      if (onWatchProc) {
        return
      }
      onWatchProc = cp.spawn(onWatch, { shell: true, stdio: 'inherit' })
      onWatchProc
        .on('error', (err) => console.log(chalk.red(err)))
        .on('close', (code) => {
          onWatchProc = null
          if (code !== 0) {
            console.log(chalk.red(`[fastify-cli] on-watch command exited with code ${code}`))
          }
          if (!allStop) {
            restart()
          }
        })
    })
  })

  emitter.on('error', (err) => {
    stop(watcher, err)
  })

  emitter.on('close', () => {
    stop(watcher)
  })

  emitter.stop = stop.bind(null, watcher)

  return emitter
}

module.exports = watch
