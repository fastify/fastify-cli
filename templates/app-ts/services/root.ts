import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify"

module.exports = function (fastify: FastifyInstance, opts: any, next: Function) {
  fastify.get('/', function (request: FastifyRequest, reply: FastifyReply<any>) {
    reply.send({ root: true })
  })

  next()
}

// If you prefer async/await, use the following
//
// module.exports = async function (fastify, opts) {
//   fastify.get('/', async function (request, reply) {
//     return { root: true }
//   })
// }
