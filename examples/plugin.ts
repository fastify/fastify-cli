import { FastifyPluginAsync } from 'fastify'

const root: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.decorate('test', true)
  fastify.get('/', async function (request, reply) {
    return { hello: 'world' }
  })
}

export default root;
