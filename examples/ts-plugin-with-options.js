'use strict'

exports.default = function (fastify, options, next) {
  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })
  next()
}

exports.options = {
  https: {
    key: 'key',
    cert: 'cert'
  }
}
