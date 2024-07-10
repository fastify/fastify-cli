import fastify from 'fastify'

type BuildOptions = {
    skipOverride?: boolean
}

declare module 'fastify-cli/helper.js' {
    module helper {
        export function build(args: Array<string>, additionalOptions?: Object, serverOptions?: Object, buildOptions?: BuildOptions): ReturnType<typeof fastify>;
    }

    export = helper;
}
