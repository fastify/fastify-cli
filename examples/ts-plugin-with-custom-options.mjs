// Module code is always strict mode code.
// http://www.ecma-international.org/ecma-262/6.0/#sec-strict-mode-code

const plugin = function (fastify, options, next) {
  fastify.get('/', (req, reply) => reply.send(options))
  next()
}
export default plugin
