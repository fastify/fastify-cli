'use strict'

const { test, beforeEach, afterEach } = require('node:test')
const assert = require('assert')
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
  assert.strictEqual(process.listenerCount('SIGINT'), signalCounter + 1)

  await fastify.close()

  assert.strictEqual(process.listenerCount('SIGINT'), signalCounter)
})

conditionalTest('should call fastify.close() on SIGINT', async (t) => {
  const sigintHandler = () => {
    try {
      sinon.assert.called(spy)
      t.pass('fastify.close() was called on SIGINT')
    } finally {
      process.exit() // Clean exit
    }
  }

  process.once('SIGINT', sigintHandler)
  process.kill(process.pid, 'SIGINT')
})
