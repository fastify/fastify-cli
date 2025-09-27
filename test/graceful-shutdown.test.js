'use strict'

const { test, beforeEach, afterEach } = require('node:test')
const sinon = require('sinon')
const start = require('../start')

let _port = 3001
function getPort () {
  return '' + _port++
}

let fastify = null
let spy = null
let signalCounter = null
const sandbox = sinon.createSandbox()

// Skip tests on Windows, Linux and MacOS
const isWindows = process.platform === 'win32'
const isMacOS = process.platform === 'darwin'
const isLinux = process.platform === 'linux'

beforeEach(async () => {
  signalCounter = process.listenerCount('SIGINT')

  const argv = ['-p', getPort(), './examples/plugin.js']
  fastify = await start.start(argv)
  spy = sinon.spy(fastify, 'close')
})

afterEach(async () => {
  sandbox.restore()
})

// Tests skip on win32 platforms due SIGINT signal is not supported across all windows platforms
test('should add and remove SIGINT listener as expected', { skip: isWindows }, async (t) => {
  t.plan(2)
  const initialCount = process.listenerCount('SIGINT')
  t.assert.strictEqual(initialCount, signalCounter + 1)
  await fastify.close()
  t.assert.strictEqual(process.listenerCount('SIGINT'), signalCounter)
})

test('should call fastify.close() on SIGINT', { skip: isWindows || isMacOS || isLinux }, (t) => {
  const sigintHandler = async () => {
    try {
      sinon.assert.called(spy)
      t.assert.ok('fastify.close() was called on SIGINT')
    } finally {
      process.removeListener('SIGINT', sigintHandler)
      await fastify.close()
    }
  }

  process.once('SIGINT', sigintHandler)
  process.kill(process.pid, 'SIGINT')
})
