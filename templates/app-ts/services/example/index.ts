import { FastifyInstance } from "fastify"

export default async function (fastify: FastifyInstance, opts: any) {
  fastify.get('/example', async function (request, reply) {
    return 'this is an example'
  })
}
