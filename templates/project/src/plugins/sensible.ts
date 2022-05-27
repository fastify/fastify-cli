import sensible, { SensibleOptions } from '@fastify/sensible'
import fp from 'fastify-plugin'

/**
 * This plugins adds some utilities to handle http errors
 *
 * @see https://github.com/fastify/fastify-sensible
 */
export default fp<SensibleOptions>(async function (fastify, opts) {
  await fastify.register(sensible, {
    errorHandler: false
  })
})
