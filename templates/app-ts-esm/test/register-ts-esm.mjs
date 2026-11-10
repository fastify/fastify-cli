import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

process.env.FASTIFY_AUTOLOAD_TYPESCRIPT = '1'
register('ts-node/esm', pathToFileURL('./'))
