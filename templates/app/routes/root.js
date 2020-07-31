'use strict'

module.exports = async function (fastify, opts) {
  fastify.get('/', async function (request, reply) {
    fastify.someSupport()
    fastify.foo()

    return { root: true }
  })
}
