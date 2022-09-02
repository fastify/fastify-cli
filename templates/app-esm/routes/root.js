'use strict'

export default async function (fastify, opts) {
  fastify.get('/', async function (request, reply) {
    return { root: true }
  })
}
