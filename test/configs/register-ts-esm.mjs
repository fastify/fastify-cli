// Registers the ts-node ESM loader via module.register(), which replaces the
// deprecated --loader flag. Node 24 fails to run test files with --loader.
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

register('ts-node/esm', pathToFileURL('./'))
