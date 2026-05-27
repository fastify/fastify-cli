import fastify from 'fastify'

declare module 'fastify-cli/helper.js' {
  namespace helper {
    export function build (args: Array<string>, additionalOptions?: Object, serverOptions?: Object, serverModule?: Object): ReturnType<typeof fastify>
    export function listen (args: Array<string>, additionalOptions?: Object, serverOptions?: Object, serverModule?: Object): ReturnType<typeof fastify>
  }

  export = helper
}
