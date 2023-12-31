'use strict'

const { test } = require('node:test')
const assert = require('node:assert')

test('should register the correct decorator', async t => {
  const app = require('fastify')()

  app.register(require('..'))

  await app.ready()

  assert.equal(app.exampleDecorator(), 'decorated')
})
