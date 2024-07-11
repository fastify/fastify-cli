import closeWithGrace from 'close-with-grace'
import type { FastifyInstance, fastify as FastifyModule } from 'fastify'
import { constants } from 'node:fs'
import { access } from 'node:fs/promises'
import { resolve } from 'node:path'
import { _import } from './import.js'
import { _require, _requireEntryFile, _requireFastify } from './require.js'

let Fastify: typeof FastifyModule
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

/**
 * Start fastify instance
 * @param {object} options options
 * @returns
 */
export async function start (_o?: Partial<StartOption>): Promise<FastifyInstance> {
  const options = await normalizeStartOptions(_o)

  // preload - require
  try {
    for (const file of options.require) {
      if (file) {
        /**
          * This check ensures we ignore `-r ""`, trailing `-r`, or
          * other silly things the user might (inadvertently) be doing.
          **/
        await _require(file)
      }
    }
  } catch (error: any) {
    stop(error)
  }
  // preload - import
  try {
    for (const file of options.import) {
      if (file) {
        /**
          * This check ensures we ignore `-i ""`, trailing `-i`, or
          * other silly things the user might (inadvertently) be doing.
          **/
        await _import(file)
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
    const PinoPretty = _require<any>('pino-pretty')
    fastifyOptions.logger.stream = PinoPretty({
      colorize: true,
      sync: true,
    })
  }

  // debug
  if (options.debug) {
    const inspector = _require<any>('node:inspector')
    inspector.open(options.debugPort, options.debugAddress)
  }

  const fastify = Fastify(fastifyOptions)

  await fastify.register(entryPlugin, { prefix: options.prefix })

  const closeListeners = closeWithGrace({ delay: 500 }, async function ({ signal, err, manual }: any) {
    if (err as boolean) {
      fastify.log.error(err)
    }
    await fastify.close()
  })

  fastify.addHook('onClose', function (instance, done) {
    closeListeners.uninstall()
    done()
  })

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

export interface StartOption {
  prefix: string
  entry: string
  require: string[]
  import: string[]
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

export async function normalizeStartOptions (options?: Partial<StartOption>): Promise<StartOption> {
  options ??= {}
  options.prefix = normalizePrefix(options.prefix)
  options.entry = await normalizeEntry(options.entry)
  options.require = normalizeRequire(options.require)
  options.import = normalizeImport(options.import)
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

export function normalizeImport (imports?: string | string[]): string[] {
  const array: string[] = []
  if (imports === undefined) return array
  imports = typeof imports === 'string' ? [imports] : imports

  for (const p of imports) {
    if (p.trim() !== '') array.push(p.trim())
  }

  return array
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
