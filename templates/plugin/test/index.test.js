const { test } = require('tap')
const Fastify = require('fastify')

test('should register the correct decorator', async function (t) {
  t.plan(1)

  const fastify = Fastify()

  fastify.register(require('..'))

  await fastify.ready()

  t.same(fastify.exampleDecorator(), 'decorated')
})
