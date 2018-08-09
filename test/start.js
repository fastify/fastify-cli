'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const baseFilename = `${__dirname}/fixtures/test_${crypto.randomBytes(16).toString('hex')}`

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const sinon = require('sinon')
const proxyquire = require('proxyquire').noPreserveCache()
const start = require('../start')

const onTravis = !!process.env.TRAVIS

// FIXME
// paths are relative to the root of the project
// this can be run only from there

test('should start the server', t => {
  t.plan(5)

  const argv = [ '-p', '3000', './examples/plugin.js' ]
  const fastify = start.start(argv)

  t.tearDown(() => fastify.close())

  fastify.ready(err => {
    t.error(err)

    sget({
      method: 'GET',
      url: 'http://localhost:3000'
    }, (err, response, body) => {
      console.log('-- response')
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('should start fastify with custom options', t => {
  t.plan(1)
  // here the test should fail because of the wrong certificate
  // or because the server is booted without the custom options
  try {
    const argv = [ '-p', '3000', '-o', 'true', './examples/plugin-with-options.js' ]
    start.start(argv)
    t.fail('Custom options')
  } catch (e) {
    t.pass('Custom options')
  }
})

test('should start the server at the given prefix', t => {
  t.plan(5)

  const argv = [ '-p', '3000', '-r', '/api/hello', './examples/plugin.js' ]

  const fastify = start.start(argv)

  t.tearDown(() => fastify.close())

  fastify.ready(err => {
    t.error(err)

    sget({
      method: 'GET',
      url: 'http://localhost:3000/api/hello'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('should start fastify at given socket path', t => {
  t.plan(2)

  const sockFile = path.resolve('test.sock')
  const argv = [ '-s', sockFile, '-o', 'true', './examples/plugin.js' ]

  const fastify = start.start(argv)
  t.tearDown(() => fastify.close())

  try {
    fs.unlinkSync(sockFile)
  } catch (e) { }

  fastify.ready(err => {
    t.error(err)

    var request = require('http').request({
      method: 'GET',
      path: '/',
      socketPath: sockFile
    }, function (response) {
      t.deepEqual(response.statusCode, 200)
    })
    request.end()
  })
})

test('should only accept plugin functions with 3 arguments', t => {
  t.plan(1)

  const oldStop = start.stop
  t.tearDown(() => { start.stop = oldStop })
  start.stop = function (err) {
    t.equal(err.message, 'Plugin function should contain 3 arguments. Refer to documentation for more information.')
  }

  const argv = [ '-p', '3000', './test/data/incorrect-plugin.js' ]
  start.start(argv)
})

test('should throw on file not found', t => {
  t.plan(1)

  const oldStop = start.stop
  t.tearDown(() => { start.stop = oldStop })
  start.stop = function (err) {
    t.ok(/Cannot find module.*not-found/.test(err.message), err.message)
  }

  const argv = [ '-p', '3000', './data/not-found.js' ]
  start.start(argv)
})

test('should throw on package not found', t => {
  t.plan(1)

  const oldStop = start.stop
  t.tearDown(() => { start.stop = oldStop })
  start.stop = function (err) {
    t.ok(/Cannot find module.*unknown-package/.test(err.message), err.message)
  }

  const argv = [ '-p', '3000', './test/data/package-not-found.js' ]
  start.start(argv)
})

test('should throw on parsing error', t => {
  t.plan(1)

  const oldStop = start.stop
  t.tearDown(() => { start.stop = oldStop })
  start.stop = function (err) {
    t.equal(err.constructor, SyntaxError)
  }

  const argv = [ '-p', '3000', './test/data/parsing-error.js' ]
  start.start(argv)
})

test('should start the server with an async/await plugin', t => {
  if (Number(process.versions.node[0]) < 7) {
    t.pass('Skip because Node version < 7')
    return t.end()
  }

  t.plan(5)

  const argv = [ '-p', '3000', './examples/async-await-plugin.js' ]
  const fastify = start.start(argv)

  t.tearDown(() => fastify.close())

  fastify.ready(err => {
    t.error(err)

    sget({
      method: 'GET',
      url: 'http://localhost:3000'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('should exit without error on help', t => {
  t.plan(1)

  const oldStop = start.stop
  t.tearDown(() => { start.stop = oldStop })
  start.stop = function (err) {
    t.equal(err, undefined)
  }

  const argv = [ '-p', '3000', '-h', 'true' ]
  start.start(argv)
})

test('should throw the right error on require file', t => {
  t.plan(1)

  const oldStop = start.stop
  t.tearDown(() => { start.stop = oldStop })
  start.stop = function (err) {
    t.ok(/undefinedVariable is not defined/.test(err.message), err.message)
  }

  const argv = [ '-p', '3000', './test/data/undefinedVariable.js' ]
  start.start(argv)
})

test('should respond 413 - Payload too large', t => {
  t.plan(5)

  const bodyTooLarge = '{1: 11}'
  const bodySmaller = '{1: 1}'

  const argv = [ '-p', '3000', '--body-limit', bodyTooLarge.length + 2 - 1, './examples/plugin.js' ]
  const fastify = start.start(argv)

  t.tearDown(() => fastify.close())

  fastify.ready(err => {
    t.error(err)

    sget({
      method: 'POST',
      url: 'http://localhost:3000',
      body: bodyTooLarge,
      json: true
    }, (err, response) => {
      t.error(err)
      t.strictEqual(response.statusCode, 413)
    })

    sget({
      method: 'POST',
      url: 'http://localhost:3000',
      body: bodySmaller,
      json: true
    }, (err, response) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
    })
  })
})

test('should start the server (using env var)', t => {
  t.plan(5)

  process.env.FASTIFY_PORT = 3030
  const argv = [ './examples/plugin.js' ]
  const fastify = start.start(argv)

  t.tearDown(() => fastify.close())

  fastify.ready(err => {
    t.error(err)

    sget({
      method: 'GET',
      url: 'http://localhost:3030'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })

      delete process.env.FASTIFY_PORT
    })
  })
})

test('should start the server (using PORT-env var)', t => {
  t.plan(5)

  process.env.PORT = 3030
  const argv = [ './examples/plugin.js' ]
  const fastify = start.start(argv)

  t.tearDown(() => fastify.close())

  fastify.ready(err => {
    t.error(err)

    sget({
      method: 'GET',
      url: 'http://localhost:3030'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })

      delete process.env.PORT
    })
  })
})

test('should start the server (using FASTIFY_PORT-env preceding PORT-env var)', t => {
  t.plan(5)

  process.env.FASTIFY_PORT = 3030
  process.env.PORT = 3031
  const argv = [ './examples/plugin.js' ]
  const fastify = start.start(argv)

  t.tearDown(() => fastify.close())

  fastify.ready(err => {
    t.error(err)

    sget({
      method: 'GET',
      url: 'http://localhost:3030'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })

      delete process.env.FASTIFY_PORT
      delete process.env.PORT
    })
  })
})

test('should start the server at the given prefix (using env var)', t => {
  t.plan(5)

  process.env.FASTIFY_PORT = 3030
  process.env.FASTIFY_PREFIX = '/api/hello'
  const argv = [ './examples/plugin.js' ]
  const fastify = start.start(argv)

  t.tearDown(() => fastify.close())

  fastify.ready(err => {
    t.error(err)

    sget({
      method: 'GET',
      url: 'http://localhost:3030/api/hello'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })

      delete process.env.FASTIFY_PORT
      delete process.env.FASTIFY_PREFIX
    })
  })
})

test('should start the server at the given prefix (using env var read from .env)', t => {
  t.plan(2)

  const argv = [ './examples/plugin.js' ]
  const fastify = start.start(argv)

  fastify.ready(err => {
    t.error(err)
    t.strictEqual(fastify.server.address().port, 8080)
    delete process.env.FASTIFY_PORT
    fastify.close()
  })
})

test('The plugin is registered with fastify-plugin', t => {
  t.plan(2)

  const argv = [ './examples/plugin.js' ]
  const fastify = start.start(argv)

  fastify.ready(err => {
    t.error(err)
    t.strictEqual(fastify.test, true)
    fastify.close()
  })
})

test('should start the server listening on 0.0.0.0 when runing in docker', t => {
  t.plan(2)
  const isDocker = sinon.stub()
  isDocker.returns(true)

  const start = proxyquire('../start', {
    'is-docker': isDocker
  })

  const argv = [ '-p', '3000', './examples/plugin.js' ]
  const fastify = start.start(argv)

  t.tearDown(() => fastify.close())

  fastify.ready(err => {
    t.error(err)
    t.strictEqual(fastify.server.address().address, '0.0.0.0')
  })
})

test('should start the server with watch options that the child process restart when directory changed', { skip: onTravis }, (t) => {
  t.plan(6)
  const tmpjs = path.resolve(baseFilename + '.js')

  fs.writeFile(tmpjs, 'hello world', function (err) {
    t.error(err)
    const argv = [ '-p', '3000', '-w', './examples/plugin.js' ]
    const fastifyEmitter = start.start(argv)

    t.tearDown(() => {
      if (fs.existsSync(tmpjs)) {
        fs.unlinkSync(tmpjs)
      }
      fastifyEmitter.emit('close')
    })

    fastifyEmitter.on('start', () => {
      t.pass('should receive start event')
      t.pass('change tmpjs')
      fs.writeFileSync(tmpjs, 'hello fastify', { flag: 'a+' }) // chokidar watch can't caught change event in travis CI, but local test is all ok. you can remove annotation in local environment.
    })

    fastifyEmitter.on('restart', () => {
      t.pass('should receive restart event')
    })

    fastifyEmitter.on('ready', () => {
      t.pass('should receive ready event')
    })
  })
})
