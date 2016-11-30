'use strict'

const t = require('tap')
const test = t.test
const request = require('request')
const cli = require('./cli')

test('should start the server', t => {
  t.plan(4)

  cli.start({
    port: 3000,
    _: ['./plugin.js']
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
