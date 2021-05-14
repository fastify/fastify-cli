'use strict'

const t = require('tap')
// Tests skip on win32 platforms due SIGINT signal is not supported across all windows platforms
const test = (process.platform === 'win32') ? t.skip : t.test
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

t.beforeEach(async () => {
  signalCounter = process.listenerCount('SIGINT')

  const argv = ['-p', getPort(), './examples/plugin.js']
  fastify = await start.start(argv)
  spy = sinon.spy(fastify, 'close')
})

t.afterEach(async () => {
  sandbox.restore()
})

test('should add and remove SIGINT listener as expected ', async t => {
  t.plan(2)

  t.equal(process.listenerCount('SIGINT'), signalCounter + 1)

  await fastify.close()

  t.equal(process.listenerCount('SIGINT'), signalCounter)

  t.end()
})

test('should have called fastify.close() when receives a SIGINT signal', async t => {
  process.once('SIGINT', () => {
    sinon.assert.called(spy)

    t.end()

    process.exit()
  })

  process.kill(process.pid, 'SIGINT')
})
