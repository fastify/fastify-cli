'use strict'

module.exports = function (fastify, options, next) {
  fastify.decorate('test', true)
  fastify.get('/hello-world', function (req, reply) {
    req.log.trace('trace')
    req.log.debug('debug')
    reply.send({ hello: 'world' })
  })
  fastify.post('/help', function (req, reply) {
    reply.send({ hello: 'world' })
  })
  next()
}
