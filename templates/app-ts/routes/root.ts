import { FastifyInstance } from "fastify"

module.exports = async function (fastify: FastifyInstance, opts: any) {
  fastify.get('/', async function (request, reply) {
    return { root: true }
  })
}
