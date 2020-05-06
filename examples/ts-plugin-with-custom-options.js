'use strict'

exports.default = function (fastify, options, next) {
  fastify.get('/', (req, reply) => reply.send(options))
  next()
}
