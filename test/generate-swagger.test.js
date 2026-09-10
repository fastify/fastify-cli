'use strict'

const path = require('node:path')
const { test } = require('node:test')
const { generateSwagger } = require('../generate-swagger')

const swaggerplugindir = path.join(__dirname, 'swaggerplugindir')
const swaggerplugin = path.join(swaggerplugindir, 'plugin.js')

test('should generate swagger', async (t) => {
  t.plan(1)

  try {
    const swagger = JSON.parse(await generateSwagger([swaggerplugin]))
    t.assert.equal(swagger.openapi, '3.0.3')
  } catch (err) {
    t.assert.ifError(err)
  }
})

test('should generate swagger in yaml format', async (t) => {
  t.plan(1)

  try {
    const swagger = await generateSwagger(['--yaml=true', swaggerplugin])
    t.assert.ok(swagger.startsWith('openapi: 3.0.3'))
  } catch (err) {
    t.assert.ifError(err)
  }
})

const proxyquire = require('proxyquire')
const { execFile } = require('node:child_process')
const { promisify } = require('node:util')
const pExecFile = promisify(execFile)
const swaggerCli = path.join(__dirname, '..', 'generate-swagger.js')

function mockExit (t) {
  t.mock.method(process, 'exit', () => {})
  t.mock.method(console, 'error', () => {})
  t.mock.method(console, 'log', () => {})
}

test('should print the help with --help', async (t) => {
  mockExit(t)
  await generateSwagger(['--help'])
  t.assert.match(console.log.mock.calls[0].arguments[0], /Usage:/)
  t.assert.strictEqual(process.exit.mock.calls[0].arguments[0], undefined)
})

test('should print the help when the file parameter is missing', async (t) => {
  mockExit(t)
  await generateSwagger([])
  t.assert.strictEqual(console.error.mock.calls[0].arguments[0], 'Missing the required file parameter\n')
  t.assert.match(console.log.mock.calls[0].arguments[0], /Usage:/)
})

test('should register the plugin with a prefix', async (t) => {
  const swagger = JSON.parse(await generateSwagger(['--prefix', '/api', swaggerplugin]))
  t.assert.strictEqual(swagger.openapi, '3.0.3')
})

test('should stop when fastify cannot be loaded', async (t) => {
  const command = proxyquire('../generate-swagger', {
    './util': {
      ...require('../util'),
      requireFastifyForModule () { throw new Error('nope') }
    }
  })
  const stop = t.mock.method(command, 'stop', () => { throw new Error('stopped') })
  await t.assert.rejects(command.generateSwagger([swaggerplugin]), /stopped/)
  t.assert.strictEqual(stop.mock.calls[0].arguments[0].message, 'nope')
})

test('should stop when the plugin cannot be loaded', async (t) => {
  const command = require('../generate-swagger')
  const stop = t.mock.method(command, 'stop', () => { throw new Error('stopped') })
  await t.assert.rejects(command.generateSwagger(['./test/data/not-found.js']), /stopped/)
  t.assert.match(stop.mock.calls[0].arguments[0].message, /not-found\.js doesn't exist within/)
})

test('should fail when @fastify/swagger is not registered', async (t) => {
  const command = require('../generate-swagger')
  t.mock.method(process, 'exit', () => { throw new Error('exited') })
  const log = t.mock.method(console, 'log', () => {})
  await t.assert.rejects(command.generateSwagger(['./examples/plugin.js']), /exited/)
  t.assert.match(log.mock.calls.map(c => c.arguments.join(' ')).join('\n'), /@fastify\/swagger plugin not installed/)
})

test('should write swagger to stdout when run directly', async (t) => {
  const { stdout } = await pExecFile(process.execPath, [swaggerCli, swaggerplugin])
  t.assert.strictEqual(JSON.parse(stdout).openapi, '3.0.3')
})

test('should exit with an error when run directly on a missing file', async (t) => {
  await t.assert.rejects(
    pExecFile(process.execPath, [swaggerCli, './test/data/not-found.js']),
    err => {
      t.assert.strictEqual(err.code, 1)
      t.assert.match(err.stderr, /not-found\.js doesn't exist within/)
      return true
    }
  )
})
