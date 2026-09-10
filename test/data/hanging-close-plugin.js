'use strict'

// Never completes the onClose hook, so close() hangs forever
module.exports = function (fastify, opts, next) {
  fastify.addHook('onClose', function (instance, done) {})
  next()
}
