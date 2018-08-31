'use strict'

// This is a counter example. WILL NOT WORK!
// we are creating an unhandledRejection on purpose
module.exports = function (fastify, opts, next) {
  Promise.reject(new Error('there is no catch'))
}
