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

// Skip tests on Windows
const isWindows = process.platform === 'win32'
const conditionalTest = isWindows ? test.skip : test

beforeEach(async () => {
  signalCounter = process.listenerCount('SIGINT')

  const argv = ['-p', getPort(), './examples/plugin.js']
  fastify = await start.start(argv)
  spy = sinon.spy(fastify, 'close')
})

afterEach(async () => {
  sandbox.restore()
})

conditionalTest('should add and remove SIGINT listener as expected', async (t) => {
  t.plan(2)
  const initialCount = process.listenerCount('SIGINT')
  t.assert.strictEqual(initialCount, signalCounter + 1)
  await fastify.close()
  t.assert.strictEqual(process.listenerCount('SIGINT'), signalCounter)
})

conditionalTest('should call fastify.close() on SIGINT', (t) => {
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
