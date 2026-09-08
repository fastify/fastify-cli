'use strict'

// Throws asynchronously once the server is up, to simulate an app crash
module.exports = function (fastify, opts, next) {
  fastify.addHook('onReady', function (done) {
    setTimeout(() => { throw new Error('async crash') }, 50)
    done()
  })
  next()
}
