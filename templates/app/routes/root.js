'use strict'

module.exports = function (fastify, opts) {
  fastify.get('/', async function (request, reply) {
    return { root: true }
  })
}
