'use strict'

module.exports = function (fastify, options, next) {
  fastify.decorate('test', true)
  fastify.get('/', function (req, reply) {
    req.log.trace('trace')
    req.log.debug('debug')
    reply.send({ hello: 'world' })
  })
  fastify.post('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })
  next()
}
