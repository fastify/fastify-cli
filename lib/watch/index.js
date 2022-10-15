'use strict'

const path = require('path')
const cp = require('child_process')
const chalk = require('chalk')
const { readFileSync, existsSync } = require('fs')
const { arrayToRegExp, logWatchVerbose } = require('./utils')
const { GRACEFUL_SHUT } = require('./constants.js')

const EventEmitter = require('events')
const chokidar = require('chokidar')
const forkPath = path.join(__dirname, './fork.js')

const watch = function (args, ignoreWatch, verboseWatch) {
  const emitter = new EventEmitter()
  let allStop = false
  let childs = []

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

    // in order to not override existing env vars, we have to load and parse
    // dotenv without modifying process.env
    let dotenvParsed = {}
    const dotenvPath = path.resolve(process.cwd(), '.env')
    if (existsSync(dotenvPath)) {
      dotenvParsed = require('dotenv').parse(readFileSync(dotenvPath, { encoding: 'utf-8' }))
      Object.keys(dotenvParsed).forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(process.env, key)) {
          // we do not want to overrideexisting env-vars
          delete dotenvParsed[key]
        }
      })
    }
    // const env = Object.assign({}, process.env, childEvent, dotenvParsed)
    const env = Object.assign({}, dotenvParsed, process.env, childEvent)

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

  const watcher = chokidar.watch(process.cwd(), { ignored: ignoredPattern })
  watcher.on('ready', function () {
    watcher.on('all', function (event, filepath) {
      if (verboseWatch) {
        logWatchVerbose(event, filepath)
      }
      try {
        const child = childs.shift()
        child.send(GRACEFUL_SHUT)
      } catch (err) {
        if (childs.length !== 0) {
          console.log(chalk.red(err))
          stop(watcher, err)
        }
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
