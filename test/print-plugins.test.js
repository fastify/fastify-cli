'use strict'

const proxyquire = require('proxyquire')
const { test } = require('node:test')
const sinon = require('sinon')
const util = require('node:util')
const exec = util.promisify(require('node:child_process').exec)

const printPlugins = require('../print-plugins')

const { NYC_PROCESS_ID, NODE_V8_COVERAGE } = process.env
const SHOULD_SKIP = NYC_PROCESS_ID || NODE_V8_COVERAGE

// This test should be skipped when coverage reporting is used since outputs won't match
test('should print plugins', { skip: SHOULD_SKIP }, async t => {
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

// This test should be skipped when coverage reporting is used since outputs won't match
test('should plugins routes via cli', { skip: SHOULD_SKIP }, async t => {
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

// This test should be skipped when coverage reporting is used since outputs won't match
test('should print plugins of server with an async/await plugin', { skip: SHOULD_SKIP }, async t => {
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
