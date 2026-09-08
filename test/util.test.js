'use strict'

const { test } = require('node:test')
const path = require('node:path')
const proxyquire = require('proxyquire')
const util = require('../util')

function mockExit (t) {
  const calls = []
  t.mock.method(process, 'exit', (code) => { calls.push(code) })
  t.mock.method(console, 'error', () => {})
  t.mock.method(console, 'warn', () => {})
  t.mock.method(console, 'log', () => {})
  return calls
}

test('exit should print errors and exit with 1', t => {
  const calls = mockExit(t)
  util.exit(new Error('boom'))
  t.assert.deepStrictEqual(calls, [1])
  t.assert.strictEqual(console.error.mock.callCount(), 1)
})

test('exit should warn on string messages and exit with 1', t => {
  const calls = mockExit(t)
  util.exit('something went wrong')
  t.assert.deepStrictEqual(calls, [1])
  t.assert.strictEqual(console.warn.mock.calls[0].arguments[0], 'Warn: something went wrong')
})

test('exit should exit cleanly without a message', t => {
  const calls = mockExit(t)
  util.exit()
  t.assert.deepStrictEqual(calls, [undefined])
})

test('requireModule should load a file path or a package name', t => {
  t.assert.strictEqual(util.requireModule('./examples/plugin.js'), require('../examples/plugin.js'))
  t.assert.strictEqual(util.requireModule('fastify'), require('fastify'))
})

test('requireESModule should load a file path or a package name', async t => {
  const fromFile = await util.requireESModule('./examples/ts-plugin-with-custom-options.mjs')
  t.assert.strictEqual(typeof fromFile.default, 'function')
  const fromPackage = await util.requireESModule('fastify')
  t.assert.strictEqual(typeof fromPackage.default, 'function')
})

test('requireModuleDefaultExport should handle cjs, esm and package names', async t => {
  const cjs = await util.requireModuleDefaultExport('./examples/plugin.js')
  t.assert.strictEqual(cjs, require('../examples/plugin.js'))
  const esm = await util.requireModuleDefaultExport('./examples/ts-plugin-with-custom-options.mjs')
  t.assert.strictEqual(typeof esm, 'function')
  const pkg = await util.requireModuleDefaultExport('fastify')
  t.assert.strictEqual(typeof pkg, 'function')
})

test('requireFastifyForModule should resolve fastify relative to the module', t => {
  const { module } = util.requireFastifyForModule('./examples/plugin.js')
  t.assert.strictEqual(module, require('fastify'))
})

test('requireFastifyForModule should exit when fastify cannot be loaded', t => {
  const calls = mockExit(t)
  const brokenUtil = proxyquire('../util', {
    'resolve-from': { silent: () => path.join(__dirname, 'data', 'not-found.js') }
  })
  brokenUtil.requireFastifyForModule('./examples/plugin.js')
  t.assert.deepStrictEqual(calls, [1])
  t.assert.strictEqual(console.warn.mock.calls[0].arguments[0], 'Warn: unable to load fastify module')
})

test('requireServerPluginFromPath should reject async plugins with the wrong arity', async t => {
  await t.assert.rejects(
    util.requireServerPluginFromPath('./test/data/async-plugin-with-one-argument.js'),
    /should contain 2 arguments/
  )
})

test('showHelpForCommand should exit with an error for an unknown command', t => {
  const calls = mockExit(t)
  util.showHelpForCommand('this-command-does-not-exist')
  t.assert.deepStrictEqual(calls, [1])
  t.assert.match(console.warn.mock.calls[0].arguments[0], /unable to get help for command/)
})

test('isKubernetes should detect the service host env variable', t => {
  const previous = process.env.KUBERNETES_SERVICE_HOST
  t.after(() => {
    if (previous === undefined) delete process.env.KUBERNETES_SERVICE_HOST
    else process.env.KUBERNETES_SERVICE_HOST = previous
  })
  process.env.KUBERNETES_SERVICE_HOST = '10.0.0.1'
  t.assert.strictEqual(util.isKubernetes(), true)
})
