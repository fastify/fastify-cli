import { test } from 'tap'
const Fastify = require('fastify')
import Support from '../../plugins/support'

test('support works standalone', async (t: any) => {
  const fastify = Fastify()
  fastify.register(Support)

  await fastify.ready()
  t.equal(fastify.someSupport(), 'hugs')
})
