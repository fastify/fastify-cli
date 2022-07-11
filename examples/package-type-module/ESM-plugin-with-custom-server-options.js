// Module code is always strict mode code.
// http://www.ecma-international.org/ecma-262/6.0/#sec-strict-mode-code
//
// this file has a .js extension, but the package.json in this folder contains '"type":"module"'

export default async function plugin (fastify, options) {
  fastify.get('/foo/', async function (req, reply) {
    return 'foo'
  })
}

export const options = {
  ignoreTrailingSlash: true
}
