'use strict'

const fp = require('fastify-plugin')

// the use of fastify-plugin is required to be able
// to export the decorators to the outer scope

module.exports = fp(async function (fastify, opts) {
  fastify.decorate('someSupport', function () {
    return 'hugs'
  })
})

// You can also use plugin with opts in fastify v2
//
// module.exports = fp(function (fastify, opts, next) {
//   fastify.decorate('someSupport', function () {
//     return 'hugs'
//   })
//   next()
// })
