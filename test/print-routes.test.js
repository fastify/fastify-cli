'use strict'

const proxyquire = require('proxyquire')
const tap = require('tap')
const sinon = require('sinon')
const util = require('node:util')
const exec = util.promisify(require('node:child_process').exec)

const printRoutes = require('../print-routes')

const test = tap.test

test('should print routes', async t => {
  t.plan(2)

  const spy = sinon.spy()
  const command = proxyquire('../print-routes', {
    './log': spy
  })
  const fastify = await command.printRoutes(['./examples/plugin.js'])

  await fastify.close()
  t.ok(spy.called)
  t.same(spy.args, [['debug', '└── / (GET, HEAD, POST)\n']])
})

// This never exits in CI for some reason
test('should print routes via cli', { skip: process.env.CI }, async t => {
  t.plan(1)
  const { stdout } = await exec('node cli.js print-routes ./examples/plugin.js', { encoding: 'utf-8', timeout: 10000 })
  t.same(
    stdout,
    '└── / (GET, HEAD, POST)\n\n'
  )
})

test('should warn on file not found', t => {
  t.plan(1)

  const oldStop = printRoutes.stop
  t.teardown(() => { printRoutes.stop = oldStop })
  printRoutes.stop = function (message) {
    t.ok(/not-found.js doesn't exist within/.test(message), message)
  }

  const argv = ['./data/not-found.js']
  printRoutes.printRoutes(argv)
})

test('should throw on package not found', t => {
  t.plan(1)

  const oldStop = printRoutes.stop
  t.teardown(() => { printRoutes.stop = oldStop })
  printRoutes.stop = function (err) {
    t.ok(/Cannot find module 'unknown-package'/.test(err.message), err.message)
  }

  const argv = ['./test/data/package-not-found.js']
  printRoutes.printRoutes(argv)
})

test('should throw on parsing error', t => {
  t.plan(1)

  const oldStop = printRoutes.stop
  t.teardown(() => { printRoutes.stop = oldStop })
  printRoutes.stop = function (err) {
    t.equal(err.constructor, SyntaxError)
  }

  const argv = ['./test/data/parsing-error.js']
  printRoutes.printRoutes(argv)
})

test('should exit without error on help', t => {
  const exit = process.exit
  process.exit = sinon.spy()

  t.teardown(() => {
    process.exit = exit
  })

  const argv = ['-h', 'true']
  printRoutes.printRoutes(argv)

  t.ok(process.exit.called)
  t.equal(process.exit.lastCall.args[0], undefined)

  t.end()
})

test('should print routes of server with an async/await plugin', async t => {
  const nodeMajorVersion = process.versions.node.split('.').map(x => parseInt(x, 10))[0]
  if (nodeMajorVersion < 7) {
    t.pass('Skip because Node version < 7')
    return t.end()
  }

  t.plan(2)

  const spy = sinon.spy()
  const command = proxyquire('../print-routes', {
    './log': spy
  })
  const argv = ['./examples/async-await-plugin.js']
  const fastify = await command.printRoutes(argv)

  await fastify.close()
  t.ok(spy.called)
  t.same(spy.args, [['debug', '└── / (GET, HEAD)\n']])
})

test('should print uncimpressed routes with --common-refix flag', async t => {
  t.plan(2)

  const spy = sinon.spy()
  const command = proxyquire('../print-routes', {
    './log': spy
  })
  await command.cli(['./examples/plugin-common-prefix.js', '--commonPrefix'])

  t.ok(spy.called)
  t.same(spy.args, [['debug', '└── /\n    └── hel\n        ├── lo-world (GET, HEAD)\n        └── p (POST)\n']])
})

test('should print debug safe GET routes with --method GET flag', async t => {
  t.plan(2)

  const spy = sinon.spy()
  const command = proxyquire('../print-routes', {
    './log': spy
  })
  await command.cli(['./examples/plugin.js', '--method', 'GET'])

  t.ok(spy.called)
  t.same(spy.args, [['debug', '└── / (GET)\n']])
})

test('should print routes with hooks with --include-hooks flag', async t => {
  t.plan(2)

  const spy = sinon.spy()
  const command = proxyquire('../print-routes', {
    './log': spy
  })
  await command.cli(['./examples/plugin.js', '--include-hooks'])

  t.ok(spy.called)
  t.same(spy.args, [['debug', '└── / (GET, POST)\n    / (HEAD)\n    • (onSend) ["headRouteOnSendHandler()"]\n']])
})
