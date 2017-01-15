'use strict'

const t = require('tap')
const test = t.test
const request = require('request')
const cli = require('./cli')

test('should start the server', t => {
  t.plan(4)

  cli.start({
    port: 3000,
    _: ['./examples/plugin.js']
  })

  request({
    method: 'GET',
    uri: 'http://localhost:3000'
  }, (err, response, body) => {
    t.error(err)
    t.strictEqual(response.statusCode, 200)
    t.strictEqual(response.headers['content-length'], '' + body.length)
    t.deepEqual(JSON.parse(body), { hello: 'world' })
    cli.stop(0)
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
