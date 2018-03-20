'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const App = require('../../app')

test('default root route', (t) => {
  t.plan(2)
  const fastify = Fastify()
  fastify.register(App)

  fastify.inject({
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.deepEqual(JSON.parse(res.payload), { root: true })
  })
})

// It you prefer async/await, use the following
//
// test('default root route', async (t) => {
//   const fastify = Fastify()
//   fastify.register(App)
//
//   const res = await fastify.inject({
//     url: '/'
//   })
//   t.deepEqual(JSON.parse(res.payload), { root: true })
// })
