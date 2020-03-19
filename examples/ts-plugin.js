'use strict'

exports.default = function (fastify, options, next) {
  fastify.decorate('test', true)
  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })
  fastify.post('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })
  next()
}
