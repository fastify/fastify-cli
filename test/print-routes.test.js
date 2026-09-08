'use strict'

const proxyquire = require('proxyquire')
const { test } = require('node:test')
const sinon = require('sinon')
const util = require('node:util')
const exec = util.promisify(require('node:child_process').exec)

const printRoutes = require('../print-routes')

test('should print routes', async t => {
  t.plan(2)

  const spy = sinon.spy()
  const command = proxyquire('../print-routes', {
    './log': spy
  })
  const fastify = await command.printRoutes(['./examples/plugin.js'])

  await fastify.close()
  t.assert.ok(spy.called)
  t.assert.deepStrictEqual(spy.args, [['debug', '└── / (GET, HEAD, POST)\n']])
})

// This never exits in CI for some reason
test('should print routes via cli', async t => {
  t.plan(1)
  const { stdout } = await exec('node cli.js print-routes ./examples/plugin.js', { encoding: 'utf-8', timeout: 10000 })
  t.assert.deepStrictEqual(
    stdout,
    '└── / (GET, HEAD, POST)\n\n'
  )
})

test('should warn on file not found', t => {
  t.plan(1)

  const oldStop = printRoutes.stop
  t.after(() => { printRoutes.stop = oldStop })
  printRoutes.stop = function (message) {
    t.assert.ok(/not-found.js doesn't exist within/.test(message), message)
  }

  const argv = ['./data/not-found.js']
  printRoutes.printRoutes(argv)
})

test('should throw on package not found', (t, done) => {
  t.plan(1)

  const oldStop = printRoutes.stop
  t.after(() => { printRoutes.stop = oldStop })
  printRoutes.stop = function (err) {
    t.assert.ok(/Cannot find module 'unknown-package'/.test(err.message), err.message)
    done()
  }

  const argv = ['./test/data/package-not-found.js']
  printRoutes.printRoutes(argv)
})

test('should throw on parsing error', (t, done) => {
  t.plan(1)

  const oldStop = printRoutes.stop
  t.after(() => { printRoutes.stop = oldStop })
  printRoutes.stop = function (err) {
    t.assert.strictEqual(err.constructor, SyntaxError)
    done()
  }

  const argv = ['./test/data/parsing-error.js']
  printRoutes.printRoutes(argv)
})

test('should exit without error on help', t => {
  const exit = process.exit
  process.exit = sinon.spy()

  t.after(() => {
    process.exit = exit
  })

  const argv = ['-h', 'true']
  printRoutes.printRoutes(argv)

  t.assert.ok(process.exit.called)
  t.assert.strictEqual(process.exit.lastCall.args[0], undefined)
})

test('should print routes of server with an async/await plugin', async t => {
  const nodeMajorVersion = process.versions.node.split('.').map(x => parseInt(x, 10))[0]
  if (nodeMajorVersion < 7) {
    t.assert.ok('Skip because Node version < 7')
    return t.assert.ok('end')
  }

  t.plan(2)

  const spy = sinon.spy()
  const command = proxyquire('../print-routes', {
    './log': spy
  })
  const argv = ['./examples/async-await-plugin.js']
  const fastify = await command.printRoutes(argv)

  await fastify.close()
  t.assert.ok(spy.called)
  t.assert.deepStrictEqual(spy.args, [['debug', '└── / (GET, HEAD)\n']])
})

test('should print uncimpressed routes with --common-refix flag', async t => {
  t.plan(2)

  const spy = sinon.spy()
  const command = proxyquire('../print-routes', {
    './log': spy
  })
  await command.cli(['./examples/plugin-common-prefix.js', '--commonPrefix'])

  t.assert.ok(spy.called)
  t.assert.deepStrictEqual(spy.args, [['debug', '└── /\n    └── hel\n        ├── lo-world (GET, HEAD)\n        └── p (POST)\n']])
})

test('should print debug safe GET routes with --method GET flag', async t => {
  t.plan(2)

  const spy = sinon.spy()
  const command = proxyquire('../print-routes', {
    './log': spy
  })
  await command.cli(['./examples/plugin.js', '--method', 'GET'])

  t.assert.ok(spy.called)
  t.assert.deepStrictEqual(spy.args, [['debug', '└── / (GET)\n']])
})

test('should print routes with hooks with --include-hooks flag', async t => {
  t.plan(2)

  const spy = sinon.spy()
  const command = proxyquire('../print-routes', {
    './log': spy
  })
  await command.cli(['./examples/plugin.js', '--include-hooks'])

  t.assert.ok(spy.called)
  t.assert.deepStrictEqual(spy.args, [['debug', '└── / (GET, POST)\n    / (HEAD)\n    • (onSend) ["headRouteOnSendHandler()"]\n']])
})

test('should print the help when the file parameter is missing', t => {
  t.mock.method(process, 'exit', () => {})
  t.mock.method(console, 'error', () => {})
  t.mock.method(console, 'log', () => {})

  printRoutes.printRoutes([])

  t.assert.strictEqual(console.error.mock.calls[0].arguments[0], 'Missing the required file parameter\n')
  t.assert.match(console.log.mock.calls[0].arguments[0], /Usage:/)
  t.assert.strictEqual(process.exit.mock.calls[0].arguments[0], undefined)
})

test('should register the plugin with a prefix', async t => {
  const spy = sinon.spy()
  const command = proxyquire('../print-routes', {
    './log': spy
  })
  const fastify = await command.printRoutes(['./examples/plugin.js', '--prefix', '/api'])
  await fastify.close()

  t.assert.ok(spy.called)
  t.assert.match(spy.args[0][1], /api|root/)
})

test('should stop when fastify cannot be loaded', t => {
  t.mock.method(process, 'exit', () => {})
  t.mock.method(console, 'warn', () => {})
  const command = proxyquire('../print-routes', {
    './util': {
      ...require('../util'),
      requireFastifyForModule () { throw new Error('nope') }
    }
  })
  const stop = t.mock.method(command, 'stop', () => {})

  command.printRoutes(['./examples/plugin.js']).catch(() => {})

  t.assert.strictEqual(stop.mock.calls[0].arguments[0].message, 'nope')
})

test('should exit with an error when run directly on a missing file', async t => {
  await t.assert.rejects(
    exec('node print-routes.js ./test/data/not-found.js', { encoding: 'utf-8', timeout: 10000 }),
    err => {
      t.assert.strictEqual(err.code, 1)
      t.assert.match(err.stderr, /not-found\.js doesn't exist within/)
      return true
    }
  )
})

test('should print routes when run directly', async t => {
  const { stdout } = await exec('node print-routes.js ./examples/plugin.js', { encoding: 'utf-8', timeout: 10000 })
  t.assert.ok(stdout.length > 0)
})
