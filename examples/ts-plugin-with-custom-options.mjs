// Module code is always strict mode code.
// http://www.ecma-international.org/ecma-262/6.0/#sec-strict-mode-code

export default async function plugin (fastify, options) {
  fastify.get('/', async function (req, reply) {
    return options
  })
}
