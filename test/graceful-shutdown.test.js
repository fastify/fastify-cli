'use strict'

const { once } = require('node:events')
const { test: nodeTest, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')
// Tests skip on win32 platforms due SIGINT signal is not supported across all windows platforms
const test = (process.platform === 'win32') ? (name, fn) => nodeTest(name, { skip: true }, fn) : nodeTest
const sinon = require('sinon')
const start = require('../start')

let _port = 3001

function getPort () {
  return '' + _port++
}

let spy = null
let fastify = null
let signalCounter = null
const sandbox = sinon.createSandbox()

beforeEach(async () => {
  signalCounter = process.listenerCount('SIGINT')

  const argv = ['-p', getPort(), './examples/plugin.js']
  fastify = await start.start(argv)
  spy = sinon.spy(fastify, 'close')
})

afterEach(async () => {
  sandbox.restore()
})

test('should add and remove SIGINT listener as expected ', async () => {
  assert.equal(process.listenerCount('SIGINT'), signalCounter + 1)

  await fastify.close()

  assert.equal(process.listenerCount('SIGINT'), signalCounter)
})

test('should have called fastify.close() when receives a SIGINT signal', async (t) => {
  const exit = process.exit
  process.exit = sinon.spy()

  t.after(() => {
    process.exit = exit
  })

  const sigintPromise = once(process, 'SIGINT')

  process.kill(process.pid, 'SIGINT')
  await sigintPromise

  sinon.assert.called(spy)
})
