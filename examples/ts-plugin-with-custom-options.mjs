// Module code is always strict mode code.
// https://262.ecma-international.org/6.0/#sec-strict-mode-code

export default async function plugin (fastify, options) {
  fastify.get('/', async function (req, reply) {
    return options
  })
}

export const options = {
  hello: 'test'
}
