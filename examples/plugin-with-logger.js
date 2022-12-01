'use strict'

module.exports = function (fastify, options, next) {
  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })
  next()
}

module.exports.options = {
  logger: {
    redact: {
      censor: '***',
      paths: [
        'foo'
      ]
    }
  }
}
