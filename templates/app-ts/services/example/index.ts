import { FastifyInstance } from "fastify"

export default async function (fastify: FastifyInstance, opts: any) {
  fastify.get('/', async function (request, reply) {
    return 'this is an example'
  })
}
