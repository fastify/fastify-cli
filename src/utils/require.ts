import type _FastifyModule from 'fastify'
import { FastifyServerOptions } from 'fastify'
import { existsSync } from 'fs'
import { extname, resolve } from 'path'
import resolveFrom from 'resolve-from'
import { pathToFileURL } from 'url'
import { _import } from './import'

/**
 * Resolve the nearest module from `process.cwd`
 * @param {string} module package name
 * @returns {object} module
 */
export function _require<T> (module: string): T {
  if (existsSync(module)) {
    // we remove the extension if we require module
    const fullPath = resolve(module)
    const extension = extname(module)
    const path = fullPath.split(extension)[0]
    return require(path)
  } else {
    return require(module)
  }
}

export type FastifyModule = typeof _FastifyModule

/**
 * Resolve the nearest fastify module from `process.cwd`
 * @param {string} entry entry file
 * @returns {object} fastify module
 */
export function _requireFastify (entry: string): FastifyModule {
  try {
    const baseDir = resolve(process.cwd(), entry)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(resolveFrom.silent(baseDir, 'fastify') ?? 'fastify')
  } catch {
    throw Error('unable to load fastify')
  }
}

/**
 * Resolve the entry file from `process.cwd`
 * @param {string} entry entry file
 * @returns {function} plugin module
 */
export async function _requireEntryFile (entry: string): Promise<{ plugin: any, options: FastifyServerOptions }> {
  const path = resolve(process.cwd(), entry)
  if (!existsSync(path)) {
    throw Error(`${path} doesn't exist within ${process.cwd()}`)
  }

  const defScriptType = await computeDefaultScriptType(path)
  const scriptType = computeScriptType(path, defScriptType)

  let plugin
  let options
  if (scriptType === 'module') {
    plugin = await _import(pathToFileURL(path).href)
  } else {
    plugin = require(path)
  }
  // we check if custom option provided
  if (typeof plugin.options === 'object') options = plugin.options

  // we check if it use default export
  if (typeof plugin.default === 'function') plugin = plugin.default

  // we check it again, if custom option provided through default export
  if (typeof plugin.options === 'object') options = plugin.options

  if (isInvalidAsyncPlugin(plugin)) {
    throw new Error('Async/Await plugin function should contain 2 arguments. Refer to documentation for more information.')
  }

  return { plugin, options }
}

/**
 * Validate plugin arguments
 * @param {function} plugin plugin function
 * @returns {boolean}
 */
export function isInvalidAsyncPlugin (plugin: Function): boolean {
  return plugin.length !== 2 && plugin.constructor.name === 'AsyncFunction'
}

/**
 * Compute the file script type
 * @param {string} name file name
 * @param {string} def default script type
 * @returns {string} script type
 */
export function computeScriptType (name: string, def?: 'commonjs' | 'module'): 'commonjs' | 'module' {
  const regexpModulePattern = /\.mjs$/i
  const regexpCommonJSPattern = /\.cjs$/i
  return (regexpModulePattern.test(name) ? 'module' : regexpCommonJSPattern.test(name) ? 'commonjs' : def) ?? 'commonjs'
}

/**
 * Compute the script type from the nearest `package.json`
 * @param {string} cwd `process.cwd`
 * @returns {string} script type
 */
export async function computeDefaultScriptType (cwd: string): Promise<'commonjs' | 'module' | undefined> {
  const { pkgUp } = await _import('pkg-up')
  const pkg = await pkgUp({ cwd })
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  if (typeof pkg === 'string') return require(pkg).type
}
