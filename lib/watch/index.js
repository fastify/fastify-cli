const path = require('path')
const cp = require('child_process')

const GRACEFUL_SHUT = 'GRACEFUL SHUTDOWN'
const FULLY_CLOSED = 'FULLY CLOSED'
const READY = 'ready'

const EventEmitter = require('events')
const chokidar = require('chokidar')
const forkPath = path.join(__dirname, './fork.js')

const emitter = new EventEmitter()

let childs = []

const stop = (watcher, err) => {
  childs.forEach(function (child) {
    child.kill()
  })
  watcher.close()
}

const watch = function (args) {
  let childEvent = null
  const run = (event) => {
    const _child = cp.fork(forkPath, args, {
      env: Object.assign({}, process.env, childEvent),
      cwd: process.cwd(),
      encoding: 'utf8'
    })

    _child.on('exit', function (code, signal) {
      if (signal === 'SIGUSR2') {
        childEvent = { childEvent: { type: 'start' } }
        childs.push(run('restart'))
      }
      return null
    })

    _child.on('message', (childEvent) => {
      const { type, err } = childEvent
      if (err) {
        emitter.emit('error', err)
        return null
      }

      if (type === FULLY_CLOSED) {
        childs.shift().kill('SIGUSR2')
        return null
      }

      if (type === READY) {
        setTimeout(function () {
          emitter.emit(type)
        }, 100)
        return null
      }

      emitter.emit(event)
    })

    return _child
  }

  childEvent = { childEvent: { type: 'start' } }
  childs.push(run('start'))

  const watcher = chokidar.watch(process.cwd(), { ignored: /(node_modules|\.git|bower_components|build|dist)/ })
  watcher.on('ready', function () {
    watcher.on('all', function (e) {
      childs[0].send(GRACEFUL_SHUT)
    })
  })

  emitter.on('error', (err) => {
    stop(watcher, err)
  })

  emitter.on('close', () => {
    stop(watcher)
  })

  return emitter
}

module.exports = watch
