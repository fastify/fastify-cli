'use strict'

module.exports = function (fastify, options, next) {
  fastify.get('/', (req, reply) => reply.send(options))
  next()
}
