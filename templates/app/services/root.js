'use strict'

module.exports = async function (fastify, opts) {
  fastify.get('/', async function (request, reply) {
    return { root: true }
  })
}

// You can also use plugin with opts in fastify v2
//
// module.exports = function (fastify, opts, next) {
//   fastify.get('/', function (request, reply) {
//     reply.send({ root: true })
//   })
//   next()
// }
