import fastify from 'fastify'

declare module 'fastify-cli/helper.js' {
    module helper {
        export function build(argv: Array<string>, config: Object): ReturnType<typeof fastify>;
    }

    export = helper;
}
