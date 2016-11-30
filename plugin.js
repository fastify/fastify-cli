module.exports = function (fastify, options, next) {
  fastify.get('/', function (req, reply) {
    reply(null, { hello: 'world' })
  })
  next()
}
