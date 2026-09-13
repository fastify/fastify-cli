'use strict'

const proxyquire = require('proxyquire')
const { test } = require('node:test')
const sinon = require('sinon')
const util = require('node:util')
const exec = util.promisify(require('node:child_process').exec)

const printPlugins = require('../print-plugins')

test('should print plugins', async t => {
  t.plan(3)

  const spy = sinon.spy()
  const command = proxyquire('../print-plugins', {
    './log': spy
  })
  const fastify = await command.printPlugins(['./examples/plugin.js'])

  await fastify.close()
  t.assert.ok(spy.called)
  t.assert.deepStrictEqual(spy.args[0][0], 'debug')
  t.assert.match(spy.args[0][1], /root \d+ ms\n├── bound _after \d+ ms\n├─┬ function \(fastify, options, next\) { -- fastify\.decorate\('test', true\) \d+ ms\n│ ├── bound _after \d+ ms\n│ ├── bound _after \d+ ms\n│ └── bound _after \d+ ms\n└── bound _after \d+ ms\n/)
})

test('should plugins routes via cli', async t => {
  t.plan(1)
  const { stdout } = await exec('node cli.js print-plugins ./examples/plugin.js', { encoding: 'utf-8', timeout: 10000 })
  t.assert.match(
    stdout,
    /root \d+ ms\n├── bound _after \d+ ms\n├─┬ function \(fastify, options, next\) { -- fastify\.decorate\('test', true\) \d+ ms\n│ ├── bound _after \d+ ms\n│ ├── bound _after \d+ ms\n│ └── bound _after \d+ ms\n└── bound _after \d+ ms\n\n/
  )
})

test('should warn on file not found', (t, done) => {
  t.plan(1)

  const oldStop = printPlugins.stop
  t.after(() => { printPlugins.stop = oldStop })
  printPlugins.stop = function (message) {
    t.assert.ok(/not-found.js doesn't exist within/.test(message), message)
    done()
  }

  const argv = ['./data/not-found.js']
  printPlugins.printPlugins(argv)
})

test('should throw on package not found', (t, done) => {
  t.plan(1)

  const oldStop = printPlugins.stop
  t.after(() => { printPlugins.stop = oldStop })
  printPlugins.stop = function (err) {
    t.assert.ok(/Cannot find module 'unknown-package'/.test(err.message), err.message)
    done()
  }

  const argv = ['./test/data/package-not-found.js']
  printPlugins.printPlugins(argv)
})

test('should throw on parsing error', (t, done) => {
  t.plan(1)

  const oldStop = printPlugins.stop
  t.after(() => { printPlugins.stop = oldStop })
  printPlugins.stop = function (err) {
    t.assert.strictEqual(err.constructor, SyntaxError)
    done()
  }

  const argv = ['./test/data/parsing-error.js']
  printPlugins.printPlugins(argv)
})

test('should exit without error on help', t => {
  const exit = process.exit
  process.exit = sinon.spy()

  t.after(() => {
    process.exit = exit
  })

  const argv = ['-h', 'true']
  printPlugins.printPlugins(argv)

  t.assert.ok(process.exit.called)
  t.assert.strictEqual(process.exit.lastCall.args[0], undefined)
})

test('should print plugins of server with an async/await plugin', async t => {
  const nodeMajorVersion = process.versions.node.split('.').map(x => parseInt(x, 10))[0]
  if (nodeMajorVersion < 7) {
    t.assert.ok('Skip because Node version < 7')
    return t.assert.ok('end')
  }

  t.plan(3)

  const spy = sinon.spy()
  const command = proxyquire('../print-plugins', {
    './log': spy
  })
  const argv = ['./examples/async-await-plugin.js']
  const fastify = await command.printPlugins(argv)

  await fastify.close()
  t.assert.ok(spy.called)
  t.assert.deepStrictEqual(spy.args[0][0], 'debug')
  t.assert.match(spy.args[0][1], /root \d+ ms\n├── bound _after \d+ ms\n├─┬ async function \(fastify, options\) { -- fastify\.get\('\/', async function \(req, reply\) { \d+ ms\n│ ├── bound _after \d+ ms\n│ └── bound _after \d+ ms\n└── bound _after \d+ ms\n/)
})

test('should print the help when the file parameter is missing', t => {
  t.mock.method(process, 'exit', () => {})
  t.mock.method(console, 'error', () => {})
  t.mock.method(console, 'log', () => {})

  printPlugins.printPlugins([])

  t.assert.strictEqual(console.error.mock.calls[0].arguments[0], 'Missing the required file parameter\n')
  t.assert.match(console.log.mock.calls[0].arguments[0], /Usage:/)
  t.assert.strictEqual(process.exit.mock.calls[0].arguments[0], undefined)
})

test('should register the plugin with a prefix', async t => {
  const spy = sinon.spy()
  const command = proxyquire('../print-plugins', {
    './log': spy
  })
  const fastify = await command.printPlugins(['./examples/plugin.js', '--prefix', '/api'])
  await fastify.close()

  t.assert.ok(spy.called)
  t.assert.match(spy.args[0][1], /api|root/)
})

test('should stop when fastify cannot be loaded', t => {
  t.mock.method(process, 'exit', () => {})
  t.mock.method(console, 'warn', () => {})
  const command = proxyquire('../print-plugins', {
    './util': {
      ...require('../util'),
      requireFastifyForModule () { throw new Error('nope') }
    }
  })
  const stop = t.mock.method(command, 'stop', () => {})

  command.printPlugins(['./examples/plugin.js']).catch(() => {})

  t.assert.strictEqual(stop.mock.calls[0].arguments[0].message, 'nope')
})

test('should exit with an error when run directly on a missing file', async t => {
  await t.assert.rejects(
    exec('node print-plugins.js ./test/data/not-found.js', { encoding: 'utf-8', timeout: 10000 }),
    err => {
      t.assert.strictEqual(err.code, 1)
      t.assert.match(err.stderr, /not-found\.js doesn't exist within/)
      return true
    }
  )
})

test('should print plugins when run directly', async t => {
  const { stdout } = await exec('node print-plugins.js ./examples/plugin.js', { encoding: 'utf-8', timeout: 10000 })
  t.assert.ok(stdout.length > 0)
})
