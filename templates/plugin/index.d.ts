import { FastifyPluginCallback } from 'fastify'

declare module 'fastify' {
  export interface FastifyInstance {
    // This is an example decorator type added to fastify
    exampleDecorator: () => string
  }
}

declare const example: FastifyPluginCallback<() => string>

export { example }
export default example
