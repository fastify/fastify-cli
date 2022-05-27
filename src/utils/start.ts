import { FastifyInstance } from 'fastify'
import { constants } from 'fs'
import { access } from 'fs/promises'
import { resolve } from 'path'
import { _import } from './import'
import { FastifyModule, _require, _requireEntryFile, _requireFastify } from './require'

// @ts-expect-error
let Fastify: FastifyModule = null

/**
 * Cache fastify module to global
 * It is useful when `watch` is enabled
 * @param {string} entry entry file
 */
function cacheFastify (entry: string): void {
  try {
    Fastify = _requireFastify(entry)
  } catch (error: any) {
    stop(error)
  }
}

export interface StartOption {
  prefix: string
  entry: string
  require: string[]
  port: number
  address: string
  debug: boolean
  debugPort: number
  debugAddress: string
  pretty: boolean
  watch: boolean
  watchIgnorePattern: string
  watchVerbose: boolean
}

/**
 * Start fastify instance
 * @param {object} options options
 * @returns
 */
export async function start (_o?: Partial<StartOption>): Promise<FastifyInstance> {
  const options = await normalizeStartOptions(_o)

  // we require the files before any actions
  try {
    for (const file of options.require) {
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (file) {
        /**
           * This check ensures we ignore `-r ""`, trailing `-r`, or
           * other silly things the user might (inadvertently) be doing.
           */
        _require(file)
      }
    }
  } catch (error: any) {
    stop(error)
  }

  // we update fastify reference
  cacheFastify(options.entry)

  let entryPlugin = null
  const fastifyOptions: any = { logger: { level: 'fatal' } }

  try {
    const plugin = await _requireEntryFile(options.entry)
    entryPlugin = plugin.plugin
    Object.assign(fastifyOptions, plugin.options)
  } catch (error: any) {
    stop(error)
  }

  if (options.pretty) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PinoPretty = require('pino-pretty')
    fastifyOptions.logger.stream = PinoPretty({
      colorize: true,
      sync: true
    })
  }

  // debug
  if (options.debug) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const inspector = require('inspector')
    inspector.open(options.debugPort, options.debugAddress)
  }

  const fastify = Fastify(fastifyOptions)

  await fastify.register(entryPlugin, { prefix: options.prefix })

  await fastify.listen({ port: options.port, host: options.address })

  return fastify as any
}

/**
 * Stop the process
 * @param {object|string} message error or message
 * @returns
 */
export function stop (message?: Error | string): void {
  if (message instanceof Error) {
    console.log(message)
    return process.exit(1)
  } else if (message !== undefined) {
    console.log(`Warn: ${message}`)
    return process.exit(1)
  }
  process.exit()
}

// we check options here
export async function normalizeStartOptions (options?: Partial<StartOption>): Promise<StartOption> {
  options ??= {}
  options.prefix = normalizePrefix(options.prefix)
  options.entry = await normalizeEntry(options.entry)
  options.require = normalizeRequire(options.require)
  options.port = normalizePort(options.port)
  options.address = await normalizeAddress(options.address)
  options.debug = normalizeDebug(options.debug)
  options.debugPort = normalizeDebugPort(options.debugPort)
  options.debugAddress = await normalizeDebugAddress(options.debugAddress)
  options.pretty = normalizePretty(options.pretty)
  options.watch = normalizeWatch(options.watch)
  options.watchIgnorePattern = normalizeWatchIgnorePattern(options.watchIgnorePattern)
  options.watchVerbose = normalizeWatchVerbose(options.watchVerbose)
  return options as StartOption
}

export function normalizePrefix (prefix?: string): string {
  return prefix ?? ''
}

export async function normalizeEntry (entry?: string): Promise<string> {
  try {
    if (typeof entry !== 'string') throw Error(`entry file expected to be a string, but recieved "${typeof entry}"`)
    await access(resolve(process.cwd(), entry), constants.F_OK | constants.R_OK)
    return entry
  } catch {
    throw Error(`entry file "${entry as string}" is not exist in ${process.cwd()} or do not have have permission to read.`)
  }
}

export function normalizeRequire (requires?: string | string[]): string[] {
  const array: string[] = []
  if (requires === undefined) return array
  requires = typeof requires === 'string' ? [requires] : requires

  for (const p of requires) {
    if (p.trim() !== '') array.push(p.trim())
  }

  return array
}

export function normalizePort (port?: number): number {
  return process.env.PORT as any ?? port ?? 3000
}

export async function normalizeAddress (address?: string): Promise<string> {
  const { default: isDocker } = await _import('is-docker')
  return address ?? (isDocker() === true ? '0.0.0.0' : 'localhost')
}

export function normalizeDebug (debug?: boolean): boolean {
  return debug ?? false
}

export function normalizeDebugPort (debugPort?: number): number {
  return debugPort ?? 9320
}

export async function normalizeDebugAddress (debugAddress?: string): Promise<string> {
  const { default: isDocker } = await _import('is-docker')
  return debugAddress ?? (isDocker() === true ? '0.0.0.0' : 'localhost')
}

export function normalizePretty (pretty?: boolean): boolean {
  return pretty ?? false
}

export function normalizeWatch (watch?: boolean): boolean {
  return watch ?? false
}

export function normalizeWatchIgnorePattern (watchIgnorePattern?: string): string {
  return watchIgnorePattern ?? 'node_modules .git'
}

export function normalizeWatchVerbose (watchVerbose?: boolean): boolean {
  return watchVerbose ?? false
}
