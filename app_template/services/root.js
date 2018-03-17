'use strict'

module.exports = function (fastify, opts, next) {
  fastify.get('/', function (request, reply) {
    reply.send({ root: true })
  })

  next()
}

// It you prefer async/await, use the following
//
// module.exports = async function (fastify, opts, next) {
//   fastify.get('/', async function (request, reply) {
//     return { root: true }
//   })
// }
