'use strict'

const path = require('node:path')
const cp = require('node:child_process')
const chalk = require('chalk').default
const { arrayToRegExp, logWatchVerbose } = require('./utils')
const { GRACEFUL_SHUT } = require('./constants.js')
const parseArgs = require('../../args')

const EventEmitter = require('node:events')
const chokidar = require('chokidar')
const { loadEnvQuitely } = require('../../env-loader.js')
const forkPath = path.join(__dirname, './fork.js')

const watch = function (args, ignoreWatch, verboseWatch, followWatch) {
  const { closeGraceDelay } = parseArgs(args)
  const emitter = new EventEmitter()
  let allStop = false
  let childs = []
  // Restart requests remove children from childs before their cleanup completes.
  const liveChildren = new Set()
  let stopping

  function removeListeners () {
    process.removeListener('SIGINT', onSigint)
    process.removeListener('SIGTERM', onSigterm)
    process.removeListener('uncaughtException', onUncaughtException)
  }

  async function closeWatcher () {
    await watcher.close()
  }

  function closeChild (child) {
    return new Promise(resolve => {
      // Give the child's own deadline time to fire, but also bound failed IPC
      // and children whose event loop cannot process the shutdown request.
      const timer = setTimeout(() => child.kill('SIGKILL'), Number(closeGraceDelay) + 1000)
      child.once('close', () => {
        clearTimeout(timer)
        resolve()
      })
      // IPC avoids a second signal when terminal Ctrl-C also reaches the child.
      // If delivery fails, the deadline above still terminates the child.
      try {
        if (child.connected) child.send(GRACEFUL_SHUT, () => {})
      } catch {
        // The IPC channel can close between checking connected and sending.
      }
    })
  }

  function shutdown (signal) {
    if (stopping) return stopping
    allStop = true
    const childrenClosed = Array.from(liveChildren, closeChild)
    stopping = (async () => {
      const results = await Promise.allSettled([
        closeWatcher(),
        ...childrenClosed
      ])
      removeListeners()
      const failure = results.find(result => result.status === 'rejected')
      if (failure) {
        console.error(failure.reason)
        process.exitCode = 1
      } else {
        process.exitCode = signal === 'SIGINT' ? 130 : 143
      }
    })()
    return stopping
  }
  const onSigint = () => { shutdown('SIGINT') }
  const onSigterm = () => { shutdown('SIGTERM') }
  const stop = (watcher = null, err = null) => {
    liveChildren.forEach(function (child) {
      child.kill()
    })

    childs = []
    if (err) {
      console.log(chalk.red(err))
    }
    if (watcher) {
      allStop = true
      removeListeners()
      return watcher.close()
    }
  }

  const onUncaughtException = () => {
    if (allStop) return
    stop()
    childs.push(run('restart'))
  }
  process.on('uncaughtException', onUncaughtException)
  process.on('SIGINT', onSigint)
  process.on('SIGTERM', onSigterm)

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

    liveChildren.add(_child)
    _child.once('close', () => liveChildren.delete(_child))

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
  watcher.on('ready', function () {
    watcher.on('all', function (event, filepath) {
      if (allStop) return
      if (verboseWatch) {
        logWatchVerbose(event, filepath)
      }
      try {
        const child = childs.shift()
        child.send(GRACEFUL_SHUT)
      } catch (err) {
        // the previous child already exited: start a new one
        childs.push(run('restart'))
      }
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
