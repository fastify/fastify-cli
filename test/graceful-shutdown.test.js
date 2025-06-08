'use strict'

const { test } = require('node:test')
// Tests skip on win32 platforms due SIGINT signal is not supported across all windows platforms
const testWin = (process.platform === 'win32') ? test.skip : test
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

test.beforeEach(async () => {
  signalCounter = process.listenerCount('SIGINT')

  const argv = ['-p', getPort(), './examples/plugin.js']
  fastify = await start.start(argv)
  spy = sinon.spy(fastify, 'close')
})

test.afterEach(async () => {
  sandbox.restore()
})

test('should add and remove SIGINT listener as expected', async (t) => {
  t.plan(2)

  t.assert.strictEqual(process.listenerCount('SIGINT'), signalCounter + 1)

  await fastify.close()

  t.assert.strictEqual(process.listenerCount('SIGINT'), signalCounter)
})

test('should have called fastify.close() when receives a SIGINT signal', async t => {
  process.once('SIGINT', () => {
    sinon.assert.called(spy)

    t.assert.ok('SIGINT signal handler called')

    process.exit()
  })

  process.kill(process.pid, 'SIGINT')
})
