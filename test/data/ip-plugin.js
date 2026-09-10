'use strict'

module.exports = function (fastify, opts, next) {
  fastify.get('/', function (req, reply) {
    reply.send({ ip: req.ip })
  })
  next()
}
