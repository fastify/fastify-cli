const { test } = require('tap')

test('should register the correct decorator', async t => {
  t.plan(1)

  const app = require('fastify')()

  app.register(require('..'))

  await app.ready()

  t.deepEqual(app.exampleDecorator(), 'decorated')
})
