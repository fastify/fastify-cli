'use strict'

module.exports = async function (fastify, opts) {
  fastify.get('/', async function (request, reply) {
    return 'this is an example'
  })
}

// You can also use plugin with opts in fastify v2
//
// module.exports = function (fastify, opts, next) {
//   fastify.get('/example', function (request, reply) {
//     reply.send('this is an example')
//   })
//   next()
// }
