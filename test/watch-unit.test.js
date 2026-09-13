'use strict'

const { test } = require('node:test')
const EventEmitter = require('node:events')
const proxyquire = require('proxyquire')
const { logWatchVerbose } = require('../lib/watch/utils')
const { GRACEFUL_SHUT } = require('../lib/watch/constants')

// Builds a watch() with a fake chokidar and a fake child_process.fork,
// so the restart logic can be driven synchronously.
function setup (t) {
  const forks = []
  const childProcessMock = {
    fork () {
      const child = new EventEmitter()
      child.kill = t.mock.fn()
      child.send = t.mock.fn()
      forks.push(child)
      return child
    }
  }

  const watcher = new EventEmitter()
  watcher.close = t.mock.fn()
  const chokidarMock = { watch: () => watcher }

  const uncaught = []
  t.mock.method(process, 'on', (event, listener) => {
    if (event === 'uncaughtException') uncaught.push(listener)
  })
  t.mock.method(console, 'log', () => {})

  const watch = proxyquire('../lib/watch', {
    chokidar: chokidarMock,
    'node:child_process': childProcessMock
  })

  return { watch, forks, watcher, uncaught }
}

test('should restart the child when a watched file changes', t => {
  const { watch, forks, watcher } = setup(t)
  watch(['app.js'], 'node_modules', false)

  watcher.emit('ready')
  watcher.emit('all', 'change', 'app.js')

  t.assert.strictEqual(forks[0].send.mock.calls[0].arguments[0], GRACEFUL_SHUT)

  forks[0].emit('exit', 0, null)
  t.assert.strictEqual(forks.length, 2, 'a new child was forked after the exit')
})

test('should log file events with verbose watch', t => {
  const { watch, watcher } = setup(t)
  watch(['app.js'], 'node_modules', true)

  watcher.emit('ready')
  watcher.emit('all', 'change', 'app.js')

  t.assert.match(console.log.mock.calls[0].arguments[0], /watch - 'change' occurred on 'app.js'/)
})

test('should fork a new child when the previous one already exited', t => {
  const { watch, forks, watcher } = setup(t)
  watch(['app.js'], 'node_modules', false)

  watcher.emit('ready')
  forks[0].send = () => { throw new Error('channel closed') }
  watcher.emit('all', 'change', 'app.js')

  t.assert.strictEqual(forks.length, 2)
})

test('should forward child events and emit ready only once', t => {
  const { watch, forks } = setup(t)
  const emitter = watch(['app.js'], 'node_modules', false)
  const events = []
  emitter.on('start', () => events.push('start'))
  emitter.on('ready', () => events.push('ready'))

  forks[0].emit('message', { type: 'start', err: null })
  forks[0].emit('message', { type: 'ready' })
  forks[0].emit('message', { type: 'ready' })

  t.assert.deepStrictEqual(events, ['start', 'ready'])
})

test('should stop everything when the child reports an error', t => {
  const { watch, forks, watcher } = setup(t)
  watch(['app.js'], 'node_modules', false)

  forks[0].emit('message', { type: 'start', err: 'boom' })

  t.assert.strictEqual(forks[0].kill.mock.callCount(), 1)
  t.assert.strictEqual(watcher.close.mock.callCount(), 1)
  t.assert.match(console.log.mock.calls[0].arguments[0], /boom/)
  forks[0].emit('exit', 1, null)
  t.assert.strictEqual(forks.length, 1, 'no restart after stop')
})

test('should stop on close', t => {
  const { watch, forks, watcher } = setup(t)
  const emitter = watch(['app.js'], 'node_modules', false)

  emitter.emit('close')

  t.assert.strictEqual(forks[0].kill.mock.callCount(), 1)
  t.assert.strictEqual(watcher.close.mock.callCount(), 1)
})

test('should restart the child on an uncaught exception', t => {
  const { watch, forks, uncaught } = setup(t)
  watch(['app.js'], 'node_modules', false)

  t.assert.strictEqual(uncaught.length, 1)
  uncaught[0](new Error('uncaught'))

  t.assert.strictEqual(forks[0].kill.mock.callCount(), 1)
  t.assert.strictEqual(forks.length, 2)
})

test('logWatchVerbose should print the relative path', t => {
  t.mock.method(console, 'log', () => {})
  logWatchVerbose('add', `${process.cwd()}/lib/a.js`)
  t.assert.match(console.log.mock.calls[0].arguments[0], /'add' occurred on 'lib\/a.js'/)
})
