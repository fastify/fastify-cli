import fp from 'fastify-plugin'
import * as http from 'http'
import fastify from 'fastify'

// the use of fastify-plugin is required to be able
// to export the decorators to the outer scope

export default fp(async function (fastify: fastify.FastifyInstance, opts: any) {
  fastify.decorate('someSupport', function () {
    return 'hugs'
  })
})

// Using Typescript you need to extend FastifyInstance
// type declaration with your plugin
declare module 'fastify' {
  export interface FastifyInstance<
  HttpServer = http.Server,
  HttpRequest = http.IncomingMessage,
  HttpResponse = http.ServerResponse
> {
    someSupport(): string;
  }
}
