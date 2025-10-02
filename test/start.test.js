/* global GLOBAL_MODULE_1, GLOBAL_MODULE_2, GLOBAL_MODULE_3, GLOBAL_MODULE_4 */
'use strict'

const util = require('node:util')
const { once } = require('node:events')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const semver = require('semver')
const baseFilename = path.join(__dirname, 'fixtures', `test_${crypto.randomBytes(16).toString('hex')}`)
const { fork } = require('node:child_process')
const moduleSupport = semver.satisfies(process.version, '>= 14 || >= 12.17.0 < 13.0.0')

const { test } = require('node:test')

const os = require('os')
const { promisify } = require('node:util')
const sinon = require('sinon')
const proxyquire = require('proxyquire').noPreserveCache()
const start = require('../start')

const writeFile = util.promisify(fs.writeFile)
const readFile = util.promisify(fs.readFile)

const mkdtemp = promisify(fs.mkdtemp)

async function createTestDir (files) {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'my-test-'))
  await Promise.all(
    Object.entries(files).map(([filename, content]) =>
      writeFile(path.join(tmpDir, filename), content)
    )
  )
  return tmpDir
}

function requireUncached (module) {
  delete require.cache[require.resolve(module)]
  return require(module)
}

let _port = 3001

function getPort () {
  return '' + _port++
}

// FIXME
// paths are relative to the root of the project
// this can be run only from there

test('should start the server', async t => {
  t.plan(4)

  const argv = ['-p', getPort(), './examples/plugin.js']
  const fastify = await start.start(argv)

  const result = await fetch(`http://localhost:${fastify.server.address().port}`)
  t.assert.strictEqual(result.status, 200)

  const body = await result.text()
  t.assert.strictEqual(result.headers.get('content-length'), '' + body.length)
  t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })

  await fastify.close()
  t.assert.ok('server closed')
})

test('should start the server with a typescript compiled module', async t => {
  t.plan(4)

  const argv = ['-p', getPort(), './examples/ts-plugin.js']
  const fastify = await start.start(argv)

  const result = await fetch(`http://localhost:${fastify.server.address().port}`)
  t.assert.strictEqual(result.status, 200)

  const body = await result.text()
  t.assert.strictEqual(result.headers.get('content-length'), '' + body.length)
  t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })

  await fastify.close()
  t.assert.ok('server closed')
})

test('should start the server with pretty output', async t => {
  t.plan(4)

  const argv = ['-p', getPort(), '-P', './examples/plugin.js']
  const fastify = await start.start(argv)

  const result = await fetch(`http://localhost:${fastify.server.address().port}`)
  t.assert.strictEqual(result.status, 200)

  const body = await result.text()
  t.assert.strictEqual(result.headers.get('content-length'), '' + body.length)
  t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })

  await fastify.close()
  t.assert.ok('server closed')
})

test('should start fastify with custom options', async t => {
  t.plan(1)
  // here the test should fail because of the wrong certificate
  // or because the server is booted without the custom options
  try {
    const argv = ['-p', getPort(), '-o', 'true', './examples/plugin-with-options.js']
    const fastify = await start.start(argv)
    await fastify.close()
    t.assert.ok('server closed')
  } catch (e) {
    t.assert.ok('Custom options')
  }
})

test('should start fastify with custom plugin options', async t => {
  t.plan(4)

  const argv = [
    '-p',
    getPort(),
    './examples/plugin-with-custom-options.js',
    '--',
    '-abc',
    '--hello',
    'world'
  ]
  const fastify = await start.start(argv)

  const result = await fetch(`http://localhost:${fastify.server.address().port}`)
  t.assert.strictEqual(result.status, 200)

  const body = await result.text()
  t.assert.strictEqual(result.headers.get('content-length'), '' + body.length)
  t.assert.deepStrictEqual(JSON.parse(body), {
    a: true,
    b: true,
    c: true,
    hello: 'world'
  })

  t.after(async () => await fastify.close())
  t.assert.ok('server closed')
})

test('should start fastify with default custom plugin options', async t => {
  t.plan(4)

  const argv = [
    '-o',
    '-p',
    getPort(),
    './examples/plugin-with-custom-options.js'
  ]
  const fastify = await start.start(argv)

  const result = await fetch(`http://localhost:${fastify.server.address().port}`)
  t.assert.strictEqual(result.status, 200)

  const body = await result.text()
  t.assert.strictEqual(result.headers.get('content-length'), '' + body.length)
  t.assert.deepStrictEqual(JSON.parse(body), {
    hello: 'test'
  })

  t.after(async () => await fastify.close())
  t.assert.ok('server closed')
})

test('should start fastify with custom options with a typescript compiled plugin', async t => {
  t.plan(1)
  // here the test should fail because of the wrong certificate
  // or because the server is booted without the custom options
  try {
    const argv = ['-p', getPort(), '-o', 'true', './examples/ts-plugin-with-options.js']
    await start.start(argv)
    t.assert.rejects('Custom options')
  } catch (e) {
    t.assert.ok('Custom options')
  }
})

test('should start fastify with custom plugin options with a typescript compiled plugin', async t => {
  t.plan(4)

  const argv = [
    '-p',
    getPort(),
    './examples/ts-plugin-with-custom-options.js',
    '--',
    '-abc',
    '--hello',
    'world'
  ]
  const fastify = await start.start(argv)

  const result = await fetch(`http://localhost:${fastify.server.address().port}`)
  t.assert.strictEqual(result.status, 200)

  const body = await result.text()
  t.assert.strictEqual(result.headers.get('content-length'), '' + body.length)
  t.assert.deepStrictEqual(JSON.parse(body), {
    a: true,
    b: true,
    c: true,
    hello: 'world'
  })

  t.after(async () => await fastify.close())
  t.assert.ok('server closed')
})

test('should start fastify with custom plugin default exported options with a typescript compiled plugin', async t => {
  t.plan(4)

  const argv = [
    '-o',
    '-p',
    getPort(),
    './examples/ts-plugin-with-custom-options.js'
  ]
  const fastify = await start.start(argv)

  const result = await fetch(`http://localhost:${fastify.server.address().port}`)
  t.assert.strictEqual(result.status, 200)

  const body = await result.text()
  t.assert.strictEqual(result.headers.get('content-length'), '' + body.length)
  t.assert.deepStrictEqual(JSON.parse(body), {
    hello: 'test'
  })

  t.after(async () => await fastify.close())
  t.assert.ok('server closed')
})

test('should start the server at the given prefix', async t => {
  t.plan(4)

  const argv = ['-p', getPort(), '-x', '/api/hello', './examples/plugin.js']
  const fastify = await start.start(argv)

  const result = await fetch(`http://localhost:${fastify.server.address().port}/api/hello`)
  t.assert.strictEqual(result.status, 200)

  const body = await result.text()
  t.assert.strictEqual(result.headers.get('content-length'), '' + body.length)
  t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })

  t.after(async () => await fastify.close())
  t.assert.ok('server closed')
})

test('should start fastify at given socket path', { skip: process.platform === 'win32' }, async t => {
  t.plan(1)

  const sockFile = path.resolve('test.sock')
  t.after(() => {
    try {
      fs.unlinkSync(sockFile)
    } catch (e) { }
  })
  const argv = ['-s', sockFile, '-o', 'true', './examples/plugin.js']

  try {
    fs.unlinkSync(sockFile)
  } catch (e) { }

  const fastify = await start.start(argv)

  await new Promise((resolve, reject) => {
    const request = require('node:http').request({
      method: 'GET',
      path: '/',
      socketPath: sockFile
    }, function (response) {
      t.assert.strictEqual(response.statusCode, 200)
      return resolve()
    })
    request.end()
  })

  t.after(async () => await fastify.close())
})

test('should error with a good timeout value', async t => {
  t.plan(1)

  const start = proxyquire('../start', {
    assert: {
      ifError (err) {
        t.assert.strictEqual(err.code, 'AVV_ERR_PLUGIN_EXEC_TIMEOUT')
      }
    }
  })

  const port = getPort()

  try {
    const argv = ['-p', port, '-T', '100', './test/data/timeout-plugin.js']
    await start.start(argv)
  } catch (err) {
    t.assert.strictEqual(err.code, 'AVV_ERR_PLUGIN_EXEC_TIMEOUT')
  }
})

test('should warn on file not found', t => {
  t.plan(1)

  const oldStop = start.stop
  t.after(() => { start.stop = oldStop })
  start.stop = function (message) {
    t.assert.ok(/not-found.js doesn't exist within/.test(message), message)
  }

  const argv = ['-p', getPort(), './data/not-found.js']
  start.start(argv)
})

test('should throw on package not found', (t, done) => {
  t.plan(1)

  const oldStop = start.stop
  t.after(() => { start.stop = oldStop })
  start.stop = function (err) {
    t.assert.ok(/Cannot find module 'unknown-package'/.test(err.message), err.message)
    done()
  }

  const argv = ['-p', getPort(), './test/data/package-not-found.js']
  start.start(argv)
})

test('should throw on parsing error', (t, done) => {
  t.plan(1)

  const oldStop = start.stop
  t.after(() => { start.stop = oldStop })
  start.stop = function (err) {
    t.assert.strictEqual(err.constructor, SyntaxError)
    done()
  }

  const argv = ['-p', getPort(), './test/data/parsing-error.js']
  start.start(argv)
})

test('should start the server with an async/await plugin', async t => {
  if (Number(process.versions.node[0]) < 7) {
    t.assert.ok('Skip because Node version < 7')
    return
  }

  t.plan(4)

  const argv = ['-p', getPort(), './examples/async-await-plugin.js']
  const fastify = await start.start(argv)

  const result = await fetch(`http://localhost:${fastify.server.address().port}`)
  t.assert.strictEqual(result.status, 200)

  const body = await result.text()
  t.assert.strictEqual(result.headers.get('content-length'), '' + body.length)
  t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })

  t.after(async () => await fastify.close())
  t.assert.ok('server closed')
})

test('should exit without error on help', t => {
  const exit = process.exit
  process.exit = sinon.spy()

  t.after(() => {
    process.exit = exit
  })

  const argv = ['-p', getPort(), '-h', 'true']
  start.start(argv)

  t.assert.ok(process.exit.called)
  t.assert.strictEqual(process.exit.lastCall.args[0], undefined)
})

test('should throw the right error on require file', (t, done) => {
  t.plan(1)

  const oldStop = start.stop
  t.after(() => { start.stop = oldStop })
  start.stop = function (err) {
    t.assert.ok(/undefinedVariable is not defined/.test(err.message), err.message)
    done()
  }

  const argv = ['-p', getPort(), './test/data/undefinedVariable.js']
  start.start(argv)
})

test('should respond 413 - Payload too large', async t => {
  t.plan(3)

  const bodyTooLarge = '{1: 11}'
  const bodySmaller = '{1: 1}'

  const bodyLimitValue = '' + (bodyTooLarge.length - 1)
  const argv = ['-p', getPort(), '--body-limit', bodyLimitValue, './examples/plugin.js']
  const fastify = await start.start(argv)

  const responseFail = await fetch(`http://localhost:${fastify.server.address().port}`, {
    method: 'POST',
    body: bodyTooLarge,
  })

  t.assert.strictEqual(responseFail.status, 413)

  const responseOk = await fetch(`http://localhost:${fastify.server.address().port}`, {
    method: 'POST',
    body: bodySmaller,
  })
  t.assert.strictEqual(responseOk.status, 200)

  t.after(async () => await fastify.close())
  t.assert.ok('server closed')
})

test('should start the server (using env var)', async t => {
  t.plan(4)

  process.env.FASTIFY_PORT = getPort()
  const argv = ['./examples/plugin.js']
  const fastify = await start.start(argv)

  const result = await fetch(`http://localhost:${process.env.FASTIFY_PORT}`)
  t.assert.strictEqual(result.status, 200)

  const body = await result.text()
  t.assert.strictEqual(result.headers.get('content-length'), '' + body.length)
  t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })

  delete process.env.FASTIFY_PORT

  t.after(async () => await fastify.close())
  t.assert.ok('server closed')
})

test('should start the server (using PORT-env var)', async t => {
  t.plan(4)

  process.env.PORT = getPort()
  const argv = ['./examples/plugin.js']
  const fastify = await start.start(argv)

  const result = await fetch(`http://localhost:${process.env.PORT}`)
  t.assert.strictEqual(result.status, 200)

  const body = await result.text()
  t.assert.strictEqual(result.headers.get('content-length'), '' + body.length)
  t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })

  delete process.env.PORT

  t.after(async () => await fastify.close())
  t.assert.ok('server closed')
})

test('should start the server (using FASTIFY_PORT-env preceding PORT-env var)', async t => {
  t.plan(4)

  process.env.FASTIFY_PORT = getPort()
  process.env.PORT = getPort()
  const argv = ['./examples/plugin.js']
  const fastify = await start.start(argv)

  const result = await fetch(`http://localhost:${process.env.FASTIFY_PORT}`)
  t.assert.strictEqual(result.status, 200)

  const body = await result.text()
  t.assert.strictEqual(result.headers.get('content-length'), '' + body.length)
  t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })

  delete process.env.FASTIFY_PORT
  delete process.env.PORT

  t.after(async () => await fastify.close())
  t.assert.ok('server closed')
})

test('should start the server (using -p preceding FASTIFY_PORT-env var)', async t => {
  t.plan(4)

  const port = getPort()
  process.env.FASTIFY_PORT = getPort()
  const argv = ['-p', port, './examples/plugin.js']
  const fastify = await start.start(argv)

  const result = await fetch(`http://localhost:${port}`)
  t.assert.strictEqual(result.status, 200)

  const body = await result.text()
  t.assert.strictEqual(result.headers.get('content-length'), '' + body.length)
  t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })

  delete process.env.FASTIFY_PORT

  t.after(async () => await fastify.close())
  t.assert.ok('server closed')
})

test('should start the server at the given prefix (using env var)', async t => {
  t.plan(4)

  process.env.FASTIFY_PORT = getPort()
  process.env.FASTIFY_PREFIX = '/api/hello'
  const argv = ['./examples/plugin.js']
  const fastify = await start.start(argv)

  const result = await fetch(`http://localhost:${process.env.FASTIFY_PORT}/api/hello`)
  t.assert.strictEqual(result.status, 200)

  const body = await result.text()
  t.assert.strictEqual(result.headers.get('content-length'), '' + body.length)
  t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })

  delete process.env.FASTIFY_PORT
  delete process.env.FASTIFY_PREFIX

  t.after(async () => await fastify.close())
  t.assert.ok('server closed')
})

test('should start the server at the given prefix (using env var read from dotenv)', async t => {
  t.plan(3)

  const start = proxyquire('../start', {
    dotenv: {
      config () {
        t.assert.ok('config called')
        process.env.FASTIFY_PORT = 8080
      }
    }
  })
  const argv = ['./examples/plugin.js']
  const fastify = await start.start(argv)
  t.assert.strictEqual(fastify.server.address().port, 8080)
  delete process.env.FASTIFY_PORT

  t.after(async () => await fastify.close())
  t.assert.ok('server closed')
})

test('should start the server listening on 0.0.0.0 when running in docker', async t => {
  t.plan(2)
  const isDocker = sinon.stub()
  isDocker.returns(true)

  const start = proxyquire('../start', {
    'is-docker': isDocker
  })

  const argv = ['-p', getPort(), './examples/plugin.js']
  const fastify = await start.start(argv)

  t.assert.strictEqual(fastify.server.address().address, '0.0.0.0')

  t.after(async () => await fastify.close())
  t.assert.ok('server closed')
})

test('should start the server listening on 0.0.0.0 when running in kubernetes', async t => {
  t.plan(2)
  const isKubernetes = sinon.stub()
  isKubernetes.returns(true)

  const start = proxyquire('../start', {
    './util': {
      ...require('../util'),
      isKubernetes
    }
  })

  const argv = ['-p', getPort(), './examples/plugin.js']
  const fastify = await start.start(argv)

  t.assert.strictEqual(fastify.server.address().address, '0.0.0.0')

  t.after(async () => await fastify.close())
  t.assert.ok('server closed')
})

test('should start the server with watch options that the child process restart when directory changed', { skip: ['win32', 'darwin'].includes(process.platform) }, async (t) => {
  t.plan(3)
  const tmpjs = path.resolve(baseFilename + '.js')

  const port = getPort()

  await writeFile(tmpjs, 'hello world')
  const argv = ['-p', port, '-w', './examples/plugin.js']
  const fastifyEmitter = await start.start(argv)

  t.after(async () => {
    if (fs.existsSync(tmpjs)) {
      fs.unlinkSync(tmpjs)
    }
    await fastifyEmitter.stop()
  })

  await once(fastifyEmitter, 'ready')
  t.assert.ok('should receive ready event')

  const restartPromise = once(fastifyEmitter, 'restart')
  await writeFile(tmpjs, 'hello fastify', { flag: 'a+' }) // chokidar watch can't catch change event in CI, but local test is all ok. you can remove annotation in local environment.
  t.assert.ok('change tmpjs')

  // this might happen more than once but does not matter in this context
  await restartPromise
  t.assert.ok('should receive restart event')
})

test('should start the server with watch and verbose-watch options that the child process restart when directory changed with console message about changes ', { skip: ['win32', 'darwin'].includes(process.platform) }, async (t) => {
  t.plan(4)

  const spy = sinon.spy()
  const watch = proxyquire('../lib/watch', {
    './utils': {
      logWatchVerbose: spy
    }
  })

  const start = proxyquire('../start', {
    './lib/watch': watch
  })

  const tmpjs = path.resolve(baseFilename + '.js')

  const port = getPort()

  await writeFile(tmpjs, 'hello world')
  const argv = ['-p', port, '-w', '--verbose-watch', './examples/plugin.js']
  const fastifyEmitter = await start.start(argv)

  t.after(async () => {
    if (fs.existsSync(tmpjs)) {
      fs.unlinkSync(tmpjs)
    }
    await fastifyEmitter.stop()
  })

  await once(fastifyEmitter, 'ready')
  t.assert.ok('should receive ready event')

  const restartPromise = once(fastifyEmitter, 'restart')
  await writeFile(tmpjs, 'hello fastify', { flag: 'a+' }) // chokidar watch can't catch change event in CI, but local test is all ok. you can remove annotation in local environment.
  t.assert.ok('change tmpjs')

  // this might happen more than once but does not matter in this context
  await restartPromise
  t.assert.ok('should receive restart event')
  t.assert.ok(spy.args.length > 0, 'should print a console message on file update')
})

test('should reload the env on restart when watching', { skip: process.platform === 'win32' }, async (t) => {
  const testdir = await createTestDir({
    '.env': 'GREETING=world',
    'plugin.js': await readFile(path.join(__dirname, '../examples/plugin-with-env.js'))
  })

  const cwd = process.cwd()
  process.chdir(testdir)

  const port = getPort()
  const argv = ['-p', port, '-w', path.join(testdir, 'plugin.js')]
  const fastifyEmitter = await requireUncached('../start').start(argv)

  t.after(() => {
    process.chdir(cwd)
  })

  await once(fastifyEmitter, 'ready')

  const r1 = await fetch(`http://localhost:${port}`)
  t.assert.strictEqual(r1.status, 200)

  const body1 = await r1.text()
  t.assert.deepStrictEqual(JSON.parse(body1), { hello: 'world' })

  await writeFile(path.join(testdir, '.env'), 'GREETING=planet')

  await once(fastifyEmitter, 'restart')

  const r2 = await fetch(`http://localhost:${port}`)
  t.assert.strictEqual(r2.status, 200)

  const body2 = await r2.text()
  t.assert.deepStrictEqual(JSON.parse(body2), { hello: 'world' }) /* world because when making a restart the server still passes the arguments that change the environment variable */

  await fastifyEmitter.stop()
})

test('should read env variables from .env file', async (t) => {
  const port = getPort()

  const testdir = await createTestDir({
    '.env': `FASTIFY_PORT=${port}`,
    'plugin.js': await readFile(path.join(__dirname, '../examples/plugin.js'))
  })

  const cwd = process.cwd()
  process.chdir(testdir)

  t.after(() => {
    process.chdir(cwd)
  })

  const fastify = await requireUncached('../start').start([path.join(testdir, 'plugin.js')])
  t.assert.strictEqual(fastify.server.address().port, +port)

  const res = await fetch(`http://localhost:${port}`)
  t.assert.strictEqual(res.status, 200)

  const body = await res.text()
  t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })

  t.after(() => fastify.close())
})

test('crash on unhandled rejection', (t, done) => {
  t.plan(1)

  const argv = ['-p', getPort(), './test/data/rejection.js']
  const child = fork(path.join(__dirname, '..', 'start.js'), argv, { silent: true })
  child.on('close', function (code) {
    t.assert.strictEqual(code, 1)
    done()
  })
})

test('should start the server with inspect options and the defalut port is 9320', async t => {
  t.plan(3)

  const start = proxyquire('../start', {
    'node:inspector': {
      open (p) {
        t.assert.strictEqual(p, 9320)
        t.assert.ok('inspect open called')
      }
    }
  })
  const argv = ['--d', './examples/plugin.js']
  const fastify = await start.start(argv)

  t.after(async () => await fastify.close())
  t.assert.ok('server closed')
})

test('should start the server with inspect options and use the exactly port', async t => {
  t.plan(3)

  const port = getPort()
  const start = proxyquire('../start', {
    'node:inspector': {
      open (p) {
        t.assert.strictEqual(p, Number(port))
        t.assert.ok('inspect open called')
      }
    }
  })
  const argv = ['--d', '--debug-port', port, './examples/plugin.js']
  const fastify = await start.start(argv)

  t.after(() => fastify.close())
  t.assert.ok('server closed')
})

test('boolean env are not overridden if no arguments are passed', async t => {
  t.plan(1)

  process.env.FASTIFY_OPTIONS = 'true'

  // here the test should fail because of the wrong certificate
  // or because the server is booted without the custom options
  try {
    const argv = ['./examples/plugin-with-options.js']
    await start.start(argv)
    t.assert.rejects('Custom options')
  } catch (e) {
    t.assert.ok('Custom options')
  }
})

test('should support preloading custom module', async t => {
  t.plan(2)

  const argv = ['-r', './test/data/custom-require.js', './examples/plugin.js']
  const fastify = await start.start(argv)
  t.assert.ok(GLOBAL_MODULE_1)

  t.after(() => fastify.close())
  t.assert.ok('server closed')
})

test('should support preloading custom ES module', async t => {
  t.plan(2)

  const argv = ['-i', './test/data/custom-import.mjs', './examples/plugin.js']
  const fastify = await start.start(argv)
  t.assert.ok(globalThis.GLOBAL_MODULE_3)

  t.after(() => fastify.close())
  t.assert.ok('server closed')
})

test('should support preloading multiple custom modules', async t => {
  t.plan(3)

  const argv = ['-r', './test/data/custom-require.js', '-r', './test/data/custom-require2.js', './examples/plugin.js']
  const fastify = await start.start(argv)
  t.assert.ok(GLOBAL_MODULE_1)
  t.assert.ok(GLOBAL_MODULE_2)

  t.after(() => fastify.close())
  t.assert.ok('server closed')
})

test('should support preloading multiple custom ES modules', async t => {
  t.plan(3)

  const argv = ['-i', './test/data/custom-import.mjs', '-i', './test/data/custom-import2.mjs', './examples/plugin.js']
  const fastify = await start.start(argv)
  t.assert.ok(GLOBAL_MODULE_3)
  t.assert.ok(GLOBAL_MODULE_4)
  t.after(async () => await fastify.close())
  t.assert.ok('server closed')
})

test('preloading custom module with empty and trailing require flags should not throw', async t => {
  t.plan(2)

  const argv = ['-r', './test/data/custom-require.js', '-r', '', './examples/plugin.js', '-r']
  const fastify = await start.start(argv)
  t.assert.ok(GLOBAL_MODULE_1)

  t.after(() => fastify.close())
  t.assert.ok('server closed')
})

test('preloading custom ES module with empty and trailing import flags should not throw', async t => {
  t.plan(2)

  const argv = ['-i', './test/data/custom-import.mjs', '-i', '', './examples/plugin.js', '-i']
  const fastify = await start.start(argv)
  t.assert.ok(GLOBAL_MODULE_3)

  t.after(() => fastify.close())
  t.assert.ok('server closed')
})

test('preloading custom module that is not found should throw', async t => {
  t.plan(2)

  const oldStop = start.stop
  t.after(() => { start.stop = oldStop })
  start.stop = function (err) {
    t.assert.ok(/Cannot find module/.test(err.message), err.message)
  }

  const argv = ['-r', './test/data/require-missing.js', './examples/plugin.js']
  const fastify = await start.start(argv)

  t.after(() => fastify.close())
  t.assert.ok('server closed')
})

test('preloading custom ES module that is not found should throw', async t => {
  t.plan(2)

  const oldStop = start.stop
  t.after(() => { start.stop = oldStop })
  start.stop = function (err) {
    t.assert.ok(/Cannot find module/.test(err.message), err.message)
  }

  const argv = ['-i', './test/data/import-missing.mjs', './examples/plugin.js']
  const fastify = await start.start(argv)

  t.after(() => fastify.close())
  t.assert.ok('server closed')
})

test('preloading custom module should be done before starting server', async t => {
  t.plan(4)

  const argv = ['./examples/plugin-with-preloaded.js']
  const fastify = await start.start(argv)

  const result = await fetch(`http://localhost:${fastify.server.address().port}`)
  t.assert.strictEqual(result.status, 200)

  const body = await result.text()
  t.assert.strictEqual(result.headers.get('content-length'), '' + body.length)
  t.assert.deepStrictEqual(JSON.parse(body), { hasPreloaded: true })

  t.after(() => fastify.close())
  t.assert.ok('server closed')
})

test('should support custom logger configuration', async t => {
  t.plan(2)

  const argv = ['-L', './test/data/custom-logger.js', './examples/plugin.js']
  const fastify = await start.start(argv)
  t.assert.ok(fastify.log.test)

  t.after(() => fastify.close())
  t.assert.ok('server closed')
})

test('should support custom logger configuration in ESM', async t => {
  t.plan(2)

  const argv = ['-L', './test/data/custom-logger.mjs', './examples/plugin.js']
  const fastify = await start.start(argv)
  t.assert.ok(fastify.log.test)

  t.after(() => fastify.close())
  t.assert.ok('server closed')
})

test('preloading a built-in module works', async t => {
  t.plan(1)

  const argv = ['-r', 'path', './examples/plugin.js']
  const fastify = await start.start(argv)
  t.after(() => fastify.close())
  t.assert.ok('server closed')
})

test('preloading a module in node_modules works', async t => {
  t.plan(1)

  const argv = ['-r', 'tap', './examples/plugin.js']
  const fastify = await start.start(argv)
  t.after(() => fastify.close())
  t.assert.ok('server closed')
})

test('should throw on logger configuration module not found', async t => {
  t.plan(2)

  const oldStop = start.stop
  t.after(() => { start.stop = oldStop })
  start.stop = function (err) {
    t.assert.ok(/Cannot find module/.test(err.message), err.message)
  }

  const argv = ['-L', './test/data/missing.js', './examples/plugin.js']
  const fastify = await start.start(argv)

  t.after(() => fastify.close())
  t.assert.ok('server closed')
})

test('should throw on async plugin with one argument', async t => {
  t.plan(1)

  const oldStop = start.stop
  t.after(() => { start.stop = oldStop })
  start.stop = function (err) {
    t.assert.ok(/Async\/Await plugin function should contain 2 arguments./.test(err.message), err.message)
  }

  const argv = ['./test/data/async-plugin-with-one-argument.js']
  await start.start(argv)
})

test('should start fastify with custom plugin options with a ESM typescript compiled plugin', { skip: !moduleSupport }, async t => {
  t.plan(4)

  const argv = [
    '-p',
    getPort(),
    './examples/ts-plugin-with-custom-options.mjs',
    '--',
    '-abc',
    '--hello',
    'world'
  ]
  const fastify = await start.start(argv)

  const result = await fetch(`http://localhost:${fastify.server.address().port}`)
  t.assert.strictEqual(result.status, 200)

  const body = await result.text()
  t.assert.strictEqual(result.headers.get('content-length'), '' + body.length)
  t.assert.deepStrictEqual(JSON.parse(body), {
    a: true,
    b: true,
    c: true,
    hello: 'world'
  })

  t.after(() => fastify.close())
  t.assert.ok('server closed')
})

test('should start fastify with custom plugin default options with a ESM typescript compiled plugin', { skip: !moduleSupport }, async t => {
  t.plan(4)

  const argv = [
    '-o',
    '-p',
    getPort(),
    './examples/ts-plugin-with-custom-options.mjs'
  ]
  const fastify = await start.start(argv)

  const result = await fetch(`http://localhost:${fastify.server.address().port}`)
  t.assert.strictEqual(result.status, 200)

  const body = await result.text()
  t.assert.strictEqual(result.headers.get('content-length'), '' + body.length)
  t.assert.deepStrictEqual(JSON.parse(body), {
    hello: 'test'
  })

  t.after(() => fastify.close())
  t.assert.ok('server closed')
})

test('should throw an error when loading ESM typescript compiled plugin and ESM is not supported', { skip: moduleSupport }, async t => {
  t.plan(1)

  const oldStop = start.stop
  t.after(() => { start.stop = oldStop })
  start.stop = function (err) {
    t.assert.ok(/Your version of node does not support ES modules./.test(err.message), err.message)
  }

  const argv = ['./examples/ts-plugin-with-custom-options.mjs']
  await start.start(argv)
})

test('should start fastify with custom plugin options with a ESM plugin with package.json "type":"module"', { skip: !moduleSupport }, async t => {
  t.plan(4)

  const argv = [
    '-p',
    getPort(),
    './examples/package-type-module/ESM-plugin-with-custom-options.js',
    '--',
    '-abc',
    '--hello',
    'world'
  ]
  const fastify = await start.start(argv)

  const result = await fetch(`http://localhost:${fastify.server.address().port}`)
  t.assert.strictEqual(result.status, 200)

  const body = await result.text()
  t.assert.strictEqual(result.headers.get('content-length'), '' + body.length)
  t.assert.deepStrictEqual(JSON.parse(body), {
    a: true,
    b: true,
    c: true,
    hello: 'world'
  })

  t.after(() => fastify.close())
  t.assert.ok('server closed')
})

test('should start fastify with custom server options (ignoreTrailingSlash) with a ESM plugin with package.json "type":"module"', { skip: !moduleSupport }, async t => {
  t.plan(5)

  const argv = [
    '-p',
    getPort(),
    './examples/package-type-module/ESM-plugin-with-custom-server-options.js',
    '--options'
  ]
  const fastify = await start.start(argv)

  const result1 = await fetch(`http://localhost:${fastify.server.address().port}/foo`)
  t.assert.strictEqual(result1.status, 200)

  const body1 = await result1.text()
  t.assert.strictEqual(result1.headers.get('content-length'), '' + body1.length)

  const result2 = await fetch(`http://localhost:${fastify.server.address().port}/foo/`)
  t.assert.strictEqual(result2.status, 200)

  const body2 = await result2.text()
  t.assert.strictEqual(result2.headers.get('content-length'), '' + body2.length)

  t.after(() => fastify.close())
  t.assert.ok('server closed')
})

test('should start fastify with custom plugin options with a CJS plugin with package.json "type":"module"', { skip: !moduleSupport }, async t => {
  t.plan(4)

  const argv = [
    '-p',
    getPort(),
    './examples/package-type-module/CJS-plugin-with-custom-options.cjs',
    '--',
    '-abc',
    '--hello',
    'world'
  ]
  const fastify = await start.start(argv)

  const result = await fetch(`http://localhost:${fastify.server.address().port}`)
  t.assert.strictEqual(result.status, 200)

  const body = await result.text()
  t.assert.strictEqual(result.headers.get('content-length'), '' + body.length)
  t.assert.deepStrictEqual(JSON.parse(body), {
    a: true,
    b: true,
    c: true,
    hello: 'world'
  })

  t.after(async () => await fastify.close())
  t.assert.ok('server closed')
})

test('should throw error for invalid fastify plugin (object)', async t => {
  t.plan(1)
  try {
    const port = getPort()
    const argv = ['-p', port, '-T', '100', './test/data/object.js']
    await start.start(argv)
    t.assert.rejects('should not start')
  } catch (err) {
    t.assert.strictEqual(err.code, 'AVV_ERR_PLUGIN_NOT_VALID')
  }
})
