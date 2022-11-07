/* global GLOBAL_MODULE_1, GLOBAL_MODULE_2 */
'use strict'

const util = require('util')
const { once } = require('events')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const semver = require('semver')
const baseFilename = path.join(__dirname, 'fixtures', `test_${crypto.randomBytes(16).toString('hex')}`)
const { fork } = require('child_process')
const moduleSupport = semver.satisfies(process.version, '>= 14 || >= 12.17.0 < 13.0.0')

const t = require('tap')
const test = t.test
const sgetOriginal = require('simple-get').concat
const sget = (opts, cb) => {
  return new Promise((resolve, reject) => {
    sgetOriginal(opts, (err, response, body) => {
      if (err) return reject(err)
      return resolve({ response, body })
    })
  })
}
const sinon = require('sinon')
const proxyquire = require('proxyquire').noPreserveCache()
const start = require('../start')

const writeFile = util.promisify(fs.writeFile)
const readFile = util.promisify(fs.readFile)

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

  const { response, body } = await sget({
    method: 'GET',
    url: `http://localhost:${fastify.server.address().port}`
  })
  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], '' + body.length)
  t.same(JSON.parse(body), { hello: 'world' })

  await fastify.close()
  t.pass('server closed')
})

test('should start the server with a typescript compiled module', async t => {
  t.plan(4)

  const argv = ['-p', getPort(), './examples/ts-plugin.js']
  const fastify = await start.start(argv)

  const { response, body } = await sget({
    method: 'GET',
    url: `http://localhost:${fastify.server.address().port}`
  })
  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], '' + body.length)
  t.same(JSON.parse(body), { hello: 'world' })

  await fastify.close()
  t.pass('server closed')
})

test('should start the server with pretty output', async t => {
  t.plan(4)

  const argv = ['-p', getPort(), '-P', './examples/plugin.js']
  const fastify = await start.start(argv)

  const { response, body } = await sget({
    method: 'GET',
    url: `http://localhost:${fastify.server.address().port}`
  })
  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], '' + body.length)
  t.same(JSON.parse(body), { hello: 'world' })

  await fastify.close()
  t.pass('server closed')
})

test('should start fastify with custom options', async t => {
  t.plan(1)
  // here the test should fail because of the wrong certificate
  // or because the server is booted without the custom options
  try {
    const argv = ['-p', getPort(), '-o', 'true', './examples/plugin-with-options.js']
    const fastify = await start.start(argv)
    await fastify.close()
    t.pass('server closed')
  } catch (e) {
    t.pass('Custom options')
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

  const { response, body } = await sget({
    method: 'GET',
    url: `http://localhost:${fastify.server.address().port}`
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], '' + body.length)
  t.same(JSON.parse(body), {
    a: true,
    b: true,
    c: true,
    hello: 'world'
  })

  await fastify.close()
  t.pass('server closed')
})

test('should start fastify with custom options with a typescript compiled plugin', async t => {
  t.plan(1)
  // here the test should fail because of the wrong certificate
  // or because the server is booted without the custom options
  try {
    const argv = ['-p', getPort(), '-o', 'true', './examples/ts-plugin-with-options.js']
    await start.start(argv)
    t.fail('Custom options')
  } catch (e) {
    t.pass('Custom options')
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

  const { response, body } = await sget({
    method: 'GET',
    url: `http://localhost:${fastify.server.address().port}`
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], '' + body.length)
  t.same(JSON.parse(body), {
    a: true,
    b: true,
    c: true,
    hello: 'world'
  })

  await fastify.close()
  t.pass('server closed')
})

test('should start the server at the given prefix', async t => {
  t.plan(4)

  const argv = ['-p', getPort(), '-x', '/api/hello', './examples/plugin.js']
  const fastify = await start.start(argv)

  const { response, body } = await sget({
    method: 'GET',
    url: `http://localhost:${fastify.server.address().port}/api/hello`
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], '' + body.length)
  t.same(JSON.parse(body), { hello: 'world' })

  await fastify.close()
  t.pass('server closed')
})

test('should start fastify at given socket path', { skip: process.platform === 'win32' }, async t => {
  t.plan(1)

  const sockFile = path.resolve('test.sock')
  t.teardown(() => {
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
    const request = require('http').request({
      method: 'GET',
      path: '/',
      socketPath: sockFile
    }, function (response) {
      t.same(response.statusCode, 200)
      return resolve()
    })
    request.end()
  })

  t.teardown(fastify.close.bind(fastify))
})

test('should error with a good timeout value', async t => {
  t.plan(1)

  const start = proxyquire('../start', {
    assert: {
      ifError (err) {
        t.equal(err.code, 'AVV_ERR_READY_TIMEOUT')
      }
    }
  })

  const port = getPort()

  try {
    const argv = ['-p', port, '-T', '100', './test/data/timeout-plugin.js']
    await start.start(argv)
  } catch (err) {
    t.equal(err.code, 'AVV_ERR_READY_TIMEOUT')
  }
})

test('should warn on file not found', t => {
  t.plan(1)

  const oldStop = start.stop
  t.teardown(() => { start.stop = oldStop })
  start.stop = function (message) {
    t.ok(/not-found.js doesn't exist within/.test(message), message)
  }

  const argv = ['-p', getPort(), './data/not-found.js']
  start.start(argv)
})

test('should throw on package not found', t => {
  t.plan(1)

  const oldStop = start.stop
  t.teardown(() => { start.stop = oldStop })
  start.stop = function (err) {
    t.ok(/Cannot find module 'unknown-package'/.test(err.message), err.message)
  }

  const argv = ['-p', getPort(), './test/data/package-not-found.js']
  start.start(argv)
})

test('should throw on parsing error', t => {
  t.plan(1)

  const oldStop = start.stop
  t.teardown(() => { start.stop = oldStop })
  start.stop = function (err) {
    t.equal(err.constructor, SyntaxError)
  }

  const argv = ['-p', getPort(), './test/data/parsing-error.js']
  start.start(argv)
})

test('should start the server with an async/await plugin', async t => {
  if (Number(process.versions.node[0]) < 7) {
    t.pass('Skip because Node version < 7')
    return t.end()
  }

  t.plan(4)

  const argv = ['-p', getPort(), './examples/async-await-plugin.js']
  const fastify = await start.start(argv)

  const { response, body } = await sget({
    method: 'GET',
    url: `http://localhost:${fastify.server.address().port}`
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], '' + body.length)
  t.same(JSON.parse(body), { hello: 'world' })

  await fastify.close()
  t.pass('server closed')
})

test('should exit without error on help', t => {
  const exit = process.exit
  process.exit = sinon.spy()

  t.teardown(() => {
    process.exit = exit
  })

  const argv = ['-p', getPort(), '-h', 'true']
  start.start(argv)

  t.ok(process.exit.called)
  t.equal(process.exit.lastCall.args[0], undefined)

  t.end()
})

test('should throw the right error on require file', t => {
  t.plan(1)

  const oldStop = start.stop
  t.teardown(() => { start.stop = oldStop })
  start.stop = function (err) {
    t.ok(/undefinedVariable is not defined/.test(err.message), err.message)
  }

  const argv = ['-p', getPort(), './test/data/undefinedVariable.js']
  start.start(argv)
})

test('should respond 413 - Payload too large', async t => {
  t.plan(3)

  const bodyTooLarge = '{1: 11}'
  const bodySmaller = '{1: 1}'

  const bodyLimitValue = '' + (bodyTooLarge.length + 2 - 1)
  const argv = ['-p', getPort(), '--body-limit', bodyLimitValue, './examples/plugin.js']
  const fastify = await start.start(argv)

  const { response: responseFail } = await sget({
    method: 'POST',
    url: `http://localhost:${fastify.server.address().port}`,
    body: bodyTooLarge,
    json: true
  })

  t.equal(responseFail.statusCode, 413)

  const { response: responseOk } = await sget({
    method: 'POST',
    url: `http://localhost:${fastify.server.address().port}`,
    body: bodySmaller,
    json: true
  })
  t.equal(responseOk.statusCode, 200)

  await fastify.close()
  t.pass('server closed')
})

test('should start the server (using env var)', async t => {
  t.plan(4)

  process.env.FASTIFY_PORT = getPort()
  const argv = ['./examples/plugin.js']
  const fastify = await start.start(argv)

  const { response, body } = await sget({
    method: 'GET',
    url: `http://localhost:${process.env.FASTIFY_PORT}`
  })
  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], '' + body.length)
  t.same(JSON.parse(body), { hello: 'world' })

  delete process.env.FASTIFY_PORT

  await fastify.close()
  t.pass('server closed')
})

test('should start the server (using PORT-env var)', async t => {
  t.plan(4)

  process.env.PORT = getPort()
  const argv = ['./examples/plugin.js']
  const fastify = await start.start(argv)

  const { response, body } = await sget({
    method: 'GET',
    url: `http://localhost:${process.env.PORT}`
  })
  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], '' + body.length)
  t.same(JSON.parse(body), { hello: 'world' })

  delete process.env.PORT

  await fastify.close()
  t.pass('server closed')
})

test('should start the server (using FASTIFY_PORT-env preceding PORT-env var)', async t => {
  t.plan(4)

  process.env.FASTIFY_PORT = getPort()
  process.env.PORT = getPort()
  const argv = ['./examples/plugin.js']
  const fastify = await start.start(argv)

  const { response, body } = await sget({
    method: 'GET',
    url: `http://localhost:${process.env.FASTIFY_PORT}`
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], '' + body.length)
  t.same(JSON.parse(body), { hello: 'world' })

  delete process.env.FASTIFY_PORT
  delete process.env.PORT

  await fastify.close()
  t.pass('server closed')
})

test('should start the server (using -p preceding FASTIFY_PORT-env var)', async t => {
  t.plan(4)

  const port = getPort()
  process.env.FASTIFY_PORT = getPort()
  const argv = ['-p', port, './examples/plugin.js']
  const fastify = await start.start(argv)

  const { response, body } = await sget({
    method: 'GET',
    url: `http://localhost:${port}`
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], '' + body.length)
  t.same(JSON.parse(body), { hello: 'world' })

  delete process.env.FASTIFY_PORT

  await fastify.close()
  t.pass('server closed')
})

test('should start the server at the given prefix (using env var)', async t => {
  t.plan(4)

  process.env.FASTIFY_PORT = getPort()
  process.env.FASTIFY_PREFIX = '/api/hello'
  const argv = ['./examples/plugin.js']
  const fastify = await start.start(argv)

  const { response, body } = await sget({
    method: 'GET',
    url: `http://localhost:${process.env.FASTIFY_PORT}/api/hello`
  })
  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], '' + body.length)
  t.same(JSON.parse(body), { hello: 'world' })

  delete process.env.FASTIFY_PORT
  delete process.env.FASTIFY_PREFIX

  await fastify.close()
  t.pass('server closed')
})

test('should start the server at the given prefix (using env var read from dotenv)', async t => {
  t.plan(3)

  const start = proxyquire('../start', {
    dotenv: {
      config () {
        t.pass('config called')
        process.env.FASTIFY_PORT = 8080
      }
    }
  })
  const argv = ['./examples/plugin.js']
  const fastify = await start.start(argv)
  t.equal(fastify.server.address().port, 8080)
  delete process.env.FASTIFY_PORT

  await fastify.close()
  t.pass('server closed')
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

  t.equal(fastify.server.address().address, '0.0.0.0')

  await fastify.close()
  t.pass('server closed')
})

test('should start the server with watch options that the child process restart when directory changed', { skip: process.platform === 'win32' }, async (t) => {
  t.plan(3)
  const tmpjs = path.resolve(baseFilename + '.js')

  const port = getPort()

  await writeFile(tmpjs, 'hello world')
  const argv = ['-p', port, '-w', './examples/plugin.js']
  const fastifyEmitter = await start.start(argv)

  t.teardown(async () => {
    if (fs.existsSync(tmpjs)) {
      fs.unlinkSync(tmpjs)
    }
    await fastifyEmitter.stop()
  })

  await once(fastifyEmitter, 'ready')
  t.pass('should receive ready event')

  await writeFile(tmpjs, 'hello fastify', { flag: 'a+' }) // chokidar watch can't catch change event in CI, but local test is all ok. you can remove annotation in local environment.
  t.pass('change tmpjs')

  // this might happen more than once but does not matter in this context
  await once(fastifyEmitter, 'restart')
  t.pass('should receive restart event')
})

test('should start the server with watch and verbose-watch options that the child process restart when directory changed with console message about changes ', { skip: process.platform === 'win32' }, async (t) => {
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

  t.teardown(async () => {
    if (fs.existsSync(tmpjs)) {
      fs.unlinkSync(tmpjs)
    }
    await fastifyEmitter.stop()
  })

  await once(fastifyEmitter, 'ready')
  t.pass('should receive ready event')

  await writeFile(tmpjs, 'hello fastify', { flag: 'a+' }) // chokidar watch can't catch change event in CI, but local test is all ok. you can remove annotation in local environment.
  t.pass('change tmpjs')

  // this might happen more than once but does not matter in this context
  await once(fastifyEmitter, 'restart')
  t.pass('should receive restart event')
  t.ok(spy.args.length > 0, 'should print a console message on file update')
})

test('should reload the env on restart when watching', { skip: process.platform === 'win32' }, async (t) => {
  const testdir = t.testdir({
    '.env': 'GREETING=world',
    'plugin.js': await readFile(path.join(__dirname, '../examples/plugin-with-env.js'))
  })

  const cwd = process.cwd()

  process.chdir(testdir)

  const port = getPort()
  const argv = ['-p', port, '-w', path.join(testdir, 'plugin.js')]
  const fastifyEmitter = await requireUncached('../start').start(argv)

  t.teardown(() => {
    process.chdir(cwd)
  })

  await once(fastifyEmitter, 'ready')

  const r1 = await sget({
    method: 'GET',
    url: `http://localhost:${port}`
  })

  t.equal(r1.response.statusCode, 200)
  t.same(JSON.parse(r1.body), { hello: 'world' })

  await writeFile(path.join(testdir, '.env'), 'GREETING=planet')

  await once(fastifyEmitter, 'restart')

  const r2 = await sget({
    method: 'GET',
    url: `http://localhost:${port}`
  })

  t.equal(r2.response.statusCode, 200)
  t.same(JSON.parse(r2.body), { hello: 'world' }) /* world because when making a restart the server still passes the arguments that change the environment variable */

  await fastifyEmitter.stop()
})

test('should read env variables from .env file', async (t) => {
  const port = getPort()

  const testdir = t.testdir({
    '.env': `FASTIFY_PORT=${port}`,
    'plugin.js': await readFile(path.join(__dirname, '../examples/plugin.js'))
  })

  const cwd = process.cwd()

  process.chdir(testdir)

  t.teardown(() => {
    process.chdir(cwd)
  })

  const fastify = await requireUncached('../start').start([path.join(testdir, 'plugin.js')])
  t.equal(fastify.server.address().port, +port)

  const res = await sget({
    method: 'GET',
    url: `http://localhost:${port}`
  })

  t.equal(res.response.statusCode, 200)
  t.same(JSON.parse(res.body), { hello: 'world' })

  await fastify.close()
})

test('crash on unhandled rejection', t => {
  t.plan(1)

  const argv = ['-p', getPort(), './test/data/rejection.js']
  const child = fork(path.join(__dirname, '..', 'start.js'), argv, { silent: true })
  child.on('close', function (code) {
    t.equal(code, 1)
  })
})

test('should start the server with inspect options and the defalut port is 9320', async t => {
  t.plan(3)

  const start = proxyquire('../start', {
    inspector: {
      open (p) {
        t.equal(p, 9320)
        t.pass('inspect open called')
      }
    }
  })
  const argv = ['--d', './examples/plugin.js']
  const fastify = await start.start(argv)

  await fastify.close()
  t.pass('server closed')
})

test('should start the server with inspect options and use the exactly port', async t => {
  t.plan(3)

  const port = getPort()
  const start = proxyquire('../start', {
    inspector: {
      open (p) {
        t.equal(p, Number(port))
        t.pass('inspect open called')
      }
    }
  })
  const argv = ['--d', '--debug-port', port, './examples/plugin.js']
  const fastify = await start.start(argv)

  await fastify.close()
  t.pass('server closed')
})

test('boolean env are not overridden if no arguments are passed', async t => {
  t.plan(1)

  process.env.FASTIFY_OPTIONS = 'true'

  // here the test should fail because of the wrong certificate
  // or because the server is booted without the custom options
  try {
    const argv = ['./examples/plugin-with-options.js']
    await start.start(argv)
    t.fail('Custom options')
  } catch (e) {
    t.pass('Custom options')
  }
})

test('should support preloading custom module', async t => {
  t.plan(2)

  const argv = ['-r', './test/data/custom-require.js', './examples/plugin.js']
  const fastify = await start.start(argv)
  t.ok(GLOBAL_MODULE_1)

  await fastify.close()
  t.pass('server closed')
})

test('should support preloading multiple custom modules', async t => {
  t.plan(3)

  const argv = ['-r', './test/data/custom-require.js', '-r', './test/data/custom-require2.js', './examples/plugin.js']
  const fastify = await start.start(argv)
  t.ok(GLOBAL_MODULE_1)
  t.ok(GLOBAL_MODULE_2)

  await fastify.close()
  t.pass('server closed')
})

test('preloading custom module with empty and trailing require flags should not throw', async t => {
  t.plan(2)

  const argv = ['-r', './test/data/custom-require.js', '-r', '', './examples/plugin.js', '-r']
  const fastify = await start.start(argv)
  t.ok(GLOBAL_MODULE_1)

  await fastify.close()
  t.pass('server closed')
})

test('preloading custom module that is not found should throw', async t => {
  t.plan(2)

  const oldStop = start.stop
  t.teardown(() => { start.stop = oldStop })
  start.stop = function (err) {
    t.ok(/Cannot find module/.test(err.message), err.message)
  }

  const argv = ['-r', './test/data/require-missing.js', './examples/plugin.js']
  const fastify = await start.start(argv)

  await fastify.close()
  t.pass('server closed')
})

test('preloading custom module should be done before starting server', async t => {
  t.plan(4)

  const argv = ['./examples/plugin-with-preloaded.js']
  const fastify = await start.start(argv)

  const { response, body } = await sget({
    method: 'GET',
    url: `http://localhost:${fastify.server.address().port}`
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], '' + body.length)
  t.same(JSON.parse(body), { hasPreloaded: true })

  await fastify.close()
  t.pass('server closed')
})

test('should support custom logger configuration', async t => {
  t.plan(2)

  const argv = ['-L', './test/data/custom-logger.js', './examples/plugin.js']
  const fastify = await start.start(argv)
  t.ok(fastify.log.test)

  await fastify.close()
  t.pass('server closed')
})

test('preloading a built-in module works', async t => {
  t.plan(1)

  const argv = ['-r', 'path', './examples/plugin.js']
  const fastify = await start.start(argv)
  await fastify.close()
  t.pass('server closed')
})

test('preloading a module in node_modules works', async t => {
  t.plan(1)

  const argv = ['-r', 'tap', './examples/plugin.js']
  const fastify = await start.start(argv)
  await fastify.close()
  t.pass('server closed')
})

test('should throw on logger configuration module not found', async t => {
  t.plan(2)

  const oldStop = start.stop
  t.teardown(() => { start.stop = oldStop })
  start.stop = function (err) {
    t.ok(/Cannot find module/.test(err.message), err.message)
  }

  const argv = ['-L', './test/data/missing.js', './examples/plugin.js']
  const fastify = await start.start(argv)

  await fastify.close()
  t.pass('server closed')
})

test('should throw on async plugin with one argument', async t => {
  t.plan(1)

  const oldStop = start.stop
  t.teardown(() => { start.stop = oldStop })
  start.stop = function (err) {
    t.ok(/Async\/Await plugin function should contain 2 arguments./.test(err.message), err.message)
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

  const { response, body } = await sget({
    method: 'GET',
    url: `http://localhost:${fastify.server.address().port}`
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], '' + body.length)
  t.same(JSON.parse(body), {
    a: true,
    b: true,
    c: true,
    hello: 'world'
  })

  await fastify.close()
  t.pass('server closed')
  t.end()
})

test('should throw an error when loading ESM typescript compiled plugin and ESM is not supported', { skip: moduleSupport }, async t => {
  t.plan(1)

  const oldStop = start.stop
  t.teardown(() => { start.stop = oldStop })
  start.stop = function (err) {
    t.ok(/Your version of node does not support ES modules./.test(err.message), err.message)
  }

  const argv = ['./examples/ts-plugin-with-custom-options.mjs']
  await start.start(argv)
  t.end()
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

  const { response, body } = await sget({
    method: 'GET',
    url: `http://localhost:${fastify.server.address().port}`
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], '' + body.length)
  t.same(JSON.parse(body), {
    a: true,
    b: true,
    c: true,
    hello: 'world'
  })

  await fastify.close()
  t.pass('server closed')
  t.end()
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

  const { response, body } = await sget({
    method: 'GET',
    url: `http://localhost:${fastify.server.address().port}/foo`
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], '' + body.length)

  const { response: response2, body: body2 } = await sget({
    method: 'GET',
    url: `http://localhost:${fastify.server.address().port}/foo/`
  })

  t.equal(response2.statusCode, 200)
  t.equal(response2.headers['content-length'], '' + body2.length)

  await fastify.close()
  t.pass('server closed')
  t.end()
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

  const { response, body } = await sget({
    method: 'GET',
    url: `http://localhost:${fastify.server.address().port}`
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], '' + body.length)
  t.same(JSON.parse(body), {
    a: true,
    b: true,
    c: true,
    hello: 'world'
  })

  await fastify.close()
  t.pass('server closed')
  t.end()
})
