import { FastifyInstance } from "fastify"

module.exports = function (fastify: FastifyInstance, opts: any, next: Function) {
  fastify.get('/example', function (request, reply) {
    reply.send('this is an example')
  })

  next()
}

// If you prefer async/await, use the following
//
// module.exports = async function (fastify, opts) {
//   fastify.get('/example', async function (request, reply) {
//     return 'this is an example'
//   })
// }
