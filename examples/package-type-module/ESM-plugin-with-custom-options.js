// Module code is always strict mode code.
// https://262.ecma-international.org/6.0/#sec-strict-mode-code
//
// this file has a .js extension, but the package.json in this folder contains '"type":"module"'

export default async function plugin (fastify, options) {
  fastify.get('/', async function (req, reply) {
    return options
  })
}
