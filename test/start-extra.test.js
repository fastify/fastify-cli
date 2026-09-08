'use strict'

const { test } = require('node:test')
const proxyquire = require('proxyquire').noPreserveCache()
const start = require('../start')

let port = 4101
const getPort = () => String(port++)

test('should print the help when the file parameter is missing', async t => {
  t.mock.method(process, 'exit', () => {})
  t.mock.method(console, 'error', () => {})
  t.mock.method(console, 'log', () => {})

  await start.start([])

  t.assert.strictEqual(console.error.mock.calls[0].arguments[0], 'Missing the required file parameter\n')
  t.assert.match(console.log.mock.calls[0].arguments[0], /Usage:/)
  t.assert.strictEqual(process.exit.mock.calls[0].arguments[0], undefined)
})

test('should stop when fastify cannot be loaded', async t => {
  const command = proxyquire('../start', {
    './util': {
      ...require('../util'),
      requireFastifyForModule () { throw new Error('nope') }
    }
  })
  const stop = t.mock.method(command, 'stop', () => { throw new Error('stopped') })

  await t.assert.rejects(command.start(['./examples/plugin.js']), /stopped/)
  t.assert.strictEqual(stop.mock.calls[0].arguments[0].message, 'nope')
})

test('stop should delegate to util.exit', t => {
  t.mock.method(process, 'exit', () => {})
  t.mock.method(console, 'warn', () => {})

  start.stop('bye')

  t.assert.strictEqual(console.warn.mock.calls[0].arguments[0], 'Warn: bye')
  t.assert.strictEqual(process.exit.mock.calls[0].arguments[0], 1)
})

test('should listen on the given address', async t => {
  const fastify = await start.start(['-p', getPort(), '-a', '127.0.0.1', './examples/plugin.js'])
  t.after(() => fastify.close())

  t.assert.strictEqual(fastify.server.address().address, '127.0.0.1')
})

test('should set trustProxy on the server', async t => {
  const fastify = await start.start(['-p', getPort(), '--trust-proxy-enabled', './test/data/ip-plugin.js'])
  t.after(() => fastify.close())

  const res = await fastify.inject({ url: '/', headers: { 'x-forwarded-for': '203.0.113.7' } })
  t.assert.strictEqual(res.json().ip, '203.0.113.7')
})

test('should log the error when the process is closing because of an error', async t => {
  let closeHandler
  const command = proxyquire('../start', {
    'close-with-grace': (opts, handler) => {
      closeHandler = handler
      return { uninstall () {} }
    }
  })
  const fastify = await command.start(['-p', getPort(), './examples/plugin.js'])
  const logged = []
  fastify.log.error = (err) => logged.push(err)

  const err = new Error('fatal')
  await closeHandler({ err })

  t.assert.deepStrictEqual(logged, [err])
  t.assert.strictEqual(fastify.server.listening, false)
})
