'use strict'

// Takes a while to become ready, so the server is not up when the plugin loads
module.exports = function (fastify, opts, next) {
  setTimeout(next, 1000)
}
