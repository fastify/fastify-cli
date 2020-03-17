import * as http from 'http'
import fastify from 'fastify'

declare module 'fastify' {
  export interface FastifyInstance<
  HttpServer = http.Server,
  HttpRequest = http.IncomingMessage,
  HttpResponse = http.ServerResponse
> {
    someSupport(): string;
  }
}
