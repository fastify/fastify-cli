'use strict'

// This is a counter example. WILL NOT WORK!
// You must have 3 arguments in your plugin function.
// Reference examples/plugin.js or examples/plugin-with-options.js
//   for a correct example of plugin declaration
module.exports = function (fastify, next) {
  fastify.get('/', function (req, reply) {
    reply.send({ wont: 'work' })
  })
  next()
}
