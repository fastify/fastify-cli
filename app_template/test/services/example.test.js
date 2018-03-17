'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const App = require('../../app')

test('example is loaded', (t) => {
  t.plan(2)
  const fastify = Fastify()
  fastify.register(App)

  fastify.inject({
    url: '/example'
  }, (err, res) => {
    t.error(err)
    t.equal(res.payload, 'this is an example')
  })
})

// It you prefer async/await, use the following
//
// test('example is loaded', async (t) => {
//   const fastify = Fastify()
//   fastify.register(App)
//
//   const res = await fastify.inject({
//     url: '/example'
//   })
//   t.equal(res.payload, 'this is an example')
// })
