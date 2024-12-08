import fastify from 'fastify'

declare module 'fastify-cli/helper.js' {
  module helper {
    export function build (args: Array<string>, additionalOptions?: Object, serverOptions?: Object): ReturnType<typeof fastify>
  }

  export = helper
}
