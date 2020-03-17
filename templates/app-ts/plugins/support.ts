import { FastifyInstance } from "fastify"
import fp from 'fastify-plugin'

// the use of fastify-plugin is required to be able
// to export the decorators to the outer scope

export default fp(async function (fastify: FastifyInstance, opts: any) {
  fastify.decorate('someSupport', function () {
    return 'hugs'
  })
})
