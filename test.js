'use strict'

const fs = require('fs')
const path = require('path')

const t = require('tap')
const test = t.test
const request = require('request')
const cli = require('./cli')

test('should start the server', t => {
  t.plan(5)

  const fastify = cli.start({
    port: 3000,
    _: ['./examples/plugin.js']
  })

  t.tearDown(() => fastify.close())

  fastify.ready(err => {
    t.error(err)

    request({
      method: 'GET',
      uri: 'http://localhost:3000'
    }, (err, response, body) => {
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
    cli.start({
      port: 3000,
      options: true,
      _: ['./examples/plugin-with-options.js']
    })
    t.fail('Custom options')
  } catch (e) {
    t.pass('Custom options')
  }
})

test('should start the server at the given prefix', t => {
  t.plan(5)

  const fastify = cli.start({
    port: 3000,
    _: ['./examples/plugin.js'],
    prefix: '/api/hello'
  })

  t.tearDown(() => fastify.close())

  fastify.ready(err => {
    t.error(err)

    request({
      method: 'GET',
      uri: 'http://localhost:3000/api/hello'
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

  const fastify = cli.start({
    socket: sockFile,
    options: true,
    _: ['./examples/plugin.js']
  })
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

  const oldStop = cli.stop
  t.tearDown(() => { cli.stop = oldStop })
  cli.stop = function (err) {
    t.equal(err.message, 'Plugin function should contain 3 arguments. Refer to documentation for more information.')
  }

  cli.start({
    port: 3000,
    _: ['./test_data/incorrect-plugin.js']
  })
})

test('should throw on file not found', t => {
  t.plan(1)

  const oldStop = cli.stop
  t.tearDown(() => { cli.stop = oldStop })
  cli.stop = function (err) {
    t.ok(/Cannot find module.*not-found/.test(err.message), err.message)
  }

  cli.start({
    port: 3000,
    _: ['./test_data/not-found.js']
  })
})

test('should throw on package not found', t => {
  t.plan(1)

  const oldStop = cli.stop
  t.tearDown(() => { cli.stop = oldStop })
  cli.stop = function (err) {
    t.ok(/Cannot find module.*unknown-package/.test(err.message), err.message)
  }

  cli.start({
    port: 3000,
    _: ['./test_data/package-not-found.js']
  })
})

test('should throw on parsing error', t => {
  t.plan(1)

  const oldStop = cli.stop
  t.tearDown(() => { cli.stop = oldStop })
  cli.stop = function (err) {
    t.equal(err.constructor, SyntaxError)
  }

  cli.start({
    port: 3000,
    _: ['./test_data/parsing-error.js']
  })
})

test('should start the server with an async/await plugin', t => {
  if (Number(process.versions.node[0]) < 7) {
    t.pass('Skip because Node version < 7')
    return t.end()
  }

  t.plan(5)

  const fastify = cli.start({
    port: 3000,
    _: ['./examples/async-await-plugin.js']
  })

  t.tearDown(() => fastify.close())

  fastify.ready(err => {
    t.error(err)

    request({
      method: 'GET',
      uri: 'http://localhost:3000'
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

  const oldStop = cli.stop
  t.tearDown(() => { cli.stop = oldStop })
  cli.stop = function (err) {
    t.equal(err, undefined)
  }

  cli.start({
    port: 3000,
    help: true
  })
})
