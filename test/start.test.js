'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const baseFilename = `${__dirname}/fixtures/test_${crypto.randomBytes(16).toString('hex')}`
const { fork } = require('child_process')

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const sinon = require('sinon')
const proxyquire = require('proxyquire').noPreserveCache()
const start = require('../start')

const onTravis = !!process.env.TRAVIS

let _port = 3001

function getPort () {
  return '' + _port++
}

// FIXME
// paths are relative to the root of the project
// this can be run only from there

test('should start the server', t => {
  t.plan(6)

  const argv = ['-p', getPort(), './examples/plugin.js']
  start.start(argv, function (err, fastify) {
    t.error(err)

    sget({
      method: 'GET',
      url: `http://localhost:${fastify.server.address().port}`
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
      fastify.close(() => {
        t.pass('server closed')
      })
    })
  })
})

test('should start fastify with custom options', t => {
  t.plan(1)
  // here the test should fail because of the wrong certificate
  // or because the server is booted without the custom options
  try {
    const argv = ['-p', getPort(), '-o', 'true', './examples/plugin-with-options.js']
    start.start(argv).close()
    t.fail('Custom options')
  } catch (e) {
    t.pass('Custom options')
  }
})

test('should start the server at the given prefix', t => {
  t.plan(6)

  const argv = ['-p', getPort(), '-r', '/api/hello', './examples/plugin.js']

  start.start(argv, (err, fastify) => {
    t.error(err)

    sget({
      method: 'GET',
      url: `http://localhost:${fastify.server.address().port}/api/hello`
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })

      fastify.close(() => {
        t.pass('server closed')
      })
    })
  })
})

test('should start fastify at given socket path', { skip: process.platform === 'win32' }, t => {
  t.plan(3)

  const sockFile = path.resolve('test.sock')
  const argv = ['-s', sockFile, '-o', 'true', './examples/plugin.js']

  const fastify = start.start(argv)

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

      fastify.close(() => {
        t.pass('server closed')
      })
    })
    request.end()
  })
})

test('should error with a good timeout value', t => {
  t.plan(1)

  const start = proxyquire('../start', {
    assert: {
      ifError (err) {
        t.equal(err.message, `ERR_AVVIO_PLUGIN_TIMEOUT: plugin did not start in time: ${path.join(__dirname, 'data', 'timeout-plugin.js')}`)
      }
    }
  })

  const argv = ['-p', '3040', '-T', '100', './test/data/timeout-plugin.js']
  start.start(argv)
})

test('should warn on file not found', t => {
  t.plan(1)

  const oldStop = start.stop
  t.tearDown(() => { start.stop = oldStop })
  start.stop = function (message) {
    t.ok(/.*not-found.js doesn't exist within/.test(message), message)
  }

  const argv = ['-p', getPort(), './data/not-found.js']
  start.start(argv)
})

test('should throw on package not found', t => {
  t.plan(1)

  const oldStop = start.stop
  t.tearDown(() => { start.stop = oldStop })
  start.stop = function (err) {
    t.ok(/Cannot find module 'unknown-package'/.test(err.message), err.message)
  }

  const argv = ['-p', getPort(), './test/data/package-not-found.js']
  start.start(argv)
})

test('should throw on parsing error', t => {
  t.plan(1)

  const oldStop = start.stop
  t.tearDown(() => { start.stop = oldStop })
  start.stop = function (err) {
    t.equal(err.constructor, SyntaxError)
  }

  const argv = ['-p', getPort(), './test/data/parsing-error.js']
  start.start(argv)
})

test('should start the server with an async/await plugin', t => {
  if (Number(process.versions.node[0]) < 7) {
    t.pass('Skip because Node version < 7')
    return t.end()
  }

  t.plan(6)

  const argv = ['-p', getPort(), './examples/async-await-plugin.js']
  start.start(argv, (err, fastify) => {
    t.error(err)

    sget({
      method: 'GET',
      url: `http://localhost:${fastify.server.address().port}`
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })

      fastify.close(() => {
        t.pass('server closed')
      })
    })
  })
})

test('should exit without error on help', t => {
  const exit = process.exit
  process.exit = sinon.spy()

  t.tearDown(() => {
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
  t.tearDown(() => { start.stop = oldStop })
  start.stop = function (err) {
    t.ok(/undefinedVariable is not defined/.test(err.message), err.message)
  }

  const argv = ['-p', getPort(), './test/data/undefinedVariable.js']
  start.start(argv)
})

test('should respond 413 - Payload too large', t => {
  t.plan(6)

  const bodyTooLarge = '{1: 11}'
  const bodySmaller = '{1: 1}'

  const bodyLimitValue = '' + (bodyTooLarge.length + 2 - 1)
  const argv = ['-p', getPort(), '--body-limit', bodyLimitValue, './examples/plugin.js']
  start.start(argv, (err, fastify) => {
    t.error(err)

    sget({
      method: 'POST',
      url: `http://localhost:${fastify.server.address().port}`,
      body: bodyTooLarge,
      json: true
    }, (err, response) => {
      t.error(err)
      t.strictEqual(response.statusCode, 413)

      sget({
        method: 'POST',
        url: `http://localhost:${fastify.server.address().port}`,
        body: bodySmaller,
        json: true
      }, (err, response) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)

        fastify.close(() => {
          t.pass('server closed')
        })
      })
    })
  })
})

test('should start the server (using env var)', t => {
  t.plan(6)

  process.env.FASTIFY_PORT = getPort()
  const argv = ['./examples/plugin.js']
  start.start(argv, (err, fastify) => {
    t.error(err)

    sget({
      method: 'GET',
      url: `http://localhost:${process.env.FASTIFY_PORT}`
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })

      delete process.env.FASTIFY_PORT

      fastify.close(() => {
        t.pass('server closed')
      })
    })
  })
})

test('should start the server (using PORT-env var)', t => {
  t.plan(6)

  process.env.PORT = getPort()
  const argv = ['./examples/plugin.js']
  start.start(argv, (err, fastify) => {
    t.error(err)

    sget({
      method: 'GET',
      url: `http://localhost:${process.env.PORT}`
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })

      delete process.env.PORT

      fastify.close(() => {
        t.pass('server closed')
      })
    })
  })
})

test('should start the server (using FASTIFY_PORT-env preceding PORT-env var)', t => {
  t.plan(6)

  process.env.FASTIFY_PORT = getPort()
  process.env.PORT = getPort()
  const argv = ['./examples/plugin.js']
  start.start(argv, (err, fastify) => {
    t.error(err)

    sget({
      method: 'GET',
      url: `http://localhost:${process.env.FASTIFY_PORT}`
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })

      delete process.env.FASTIFY_PORT
      delete process.env.PORT

      fastify.close(() => {
        t.pass('server closed')
      })
    })
  })
})

test('should start the server (using -p preceding FASTIFY_PORT-env var)', t => {
  t.plan(6)

  const port = getPort()
  process.env.FASTIFY_PORT = getPort()
  const argv = ['-p', port, './examples/plugin.js']
  start.start(argv, (err, fastify) => {
    t.error(err)

    sget({
      method: 'GET',
      url: `http://localhost:${port}`
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })

      delete process.env.FASTIFY_PORT

      fastify.close(() => {
        t.pass('server closed')
      })
    })
  })
})

test('should start the server at the given prefix (using env var)', t => {
  t.plan(6)

  process.env.FASTIFY_PORT = getPort()
  process.env.FASTIFY_PREFIX = '/api/hello'
  const argv = ['./examples/plugin.js']
  start.start(argv, (err, fastify) => {
    t.error(err)

    sget({
      method: 'GET',
      url: `http://localhost:${process.env.FASTIFY_PORT}/api/hello`
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })

      delete process.env.FASTIFY_PORT
      delete process.env.FASTIFY_PREFIX

      fastify.close(() => {
        t.pass('server closed')
      })
    })
  })
})

test('should start the server at the given prefix (using env var read from dotenv)', t => {
  t.plan(4)

  const start = proxyquire('../start', {
    dotenv: {
      config () {
        t.pass('config called')
        process.env.FASTIFY_PORT = 8080
      }
    }
  })
  const argv = ['./examples/plugin.js']
  start.start(argv, (err, fastify) => {
    t.error(err)
    t.strictEqual(fastify.server.address().port, 8080)
    delete process.env.FASTIFY_PORT

    fastify.close(() => {
      t.pass('server closed')
    })
  })
})

test('should start the server listening on 0.0.0.0 when runing in docker', t => {
  t.plan(3)
  const isDocker = sinon.stub()
  isDocker.returns(true)

  const start = proxyquire('../start', {
    'is-docker': isDocker
  })

  const argv = ['-p', getPort(), './examples/plugin.js']
  start.start(argv, (err, fastify) => {
    t.error(err)
    t.strictEqual(fastify.server.address().address, '0.0.0.0')

    fastify.close(function () {
      t.pass('close called')
    })
  })
})

test('should start the server with watch options that the child process restart when directory changed', { skip: onTravis }, (t) => {
  t.plan(5)
  const tmpjs = path.resolve(baseFilename + '.js')

  fs.writeFile(tmpjs, 'hello world', function (err) {
    t.error(err)
    const argv = ['-p', '3042', '-w', './examples/plugin.js']
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

test('crash on unhandled rejection', t => {
  t.plan(1)

  const argv = ['-p', getPort(), './test/data/rejection.js']
  const child = fork(path.join(__dirname, '..', 'start.js'), argv, { silent: true })
  child.on('close', function (code) {
    t.strictEqual(code, 1)
  })
})

if (!process.version.match(/v[0-6]\..*/g)) {
  test('should start the server with inspect options and the defalut port is 9320', t => {
    t.plan(4)

    const start = proxyquire('../start', {
      inspector: {
        open (p) {
          t.strictEqual(p, 9320)
          t.pass('inspect open called')
        }
      }
    })
    const argv = ['--d', './examples/plugin.js']

    start.start(argv, (err, fastify) => {
      t.error(err)

      fastify.close(() => {
        t.pass('server closed')
      })
    })
  })

  test('should start the server with inspect options and use the exactly port', t => {
    t.plan(4)

    const port = getPort()
    const start = proxyquire('../start', {
      inspector: {
        open (p) {
          t.strictEqual(p, Number(port))
          t.pass('inspect open called')
        }
      }
    })
    const argv = ['--d', '--debug-port', port, './examples/plugin.js']

    start.start(argv, (err, fastify) => {
      t.error(err)

      fastify.close(() => {
        t.pass('server closed')
      })
    })
  })
}

test('boolean env are not overridden if no arguments are passed', t => {
  t.plan(1)

  process.env.FASTIFY_OPTIONS = 'true'

  // here the test should fail because of the wrong certificate
  // or because the server is booted without the custom options
  try {
    const argv = ['./examples/plugin-with-options.js']
    start.start(argv).close()
    t.fail('Custom options')
  } catch (e) {
    t.pass('Custom options')
  }
})

test('should support custom logger configuration', t => {
  t.plan(2)

  const argv = ['-L', './test/data/custom-logger.js', './examples/plugin.js']
  start.start(argv, (err, fastify) => {
    t.error(err)
    t.ok(fastify.log.test)

    fastify.close()
  })
})

test('should throw on logger configuration module not found', t => {
  t.plan(2)

  const oldStop = start.stop
  t.tearDown(() => { start.stop = oldStop })
  start.stop = function (err) {
    t.ok(/Cannot find module/.test(err.message), err.message)
  }

  const argv = ['-L', './test/data/missing.js', './examples/plugin.js']
  start.start(argv, (err, fastify) => {
    t.error(err)

    fastify.close()
  })
})
