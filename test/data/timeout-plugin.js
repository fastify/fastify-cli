'use strict'

// This is a counter example. WILL NOT WORK!
// the next function is not called
module.exports = function (fastify, opts, next) {
  fastify.get('/', function (req, reply) {
    reply.send({ wont: 'work' })
  })
  // next() not called on purpose
}
