'use strict'

const parseArgs = require('./lib/parse-args')
const { requireModule } = require('./util')
const { loadEnvQuitely } = require('./env-loader')

const DEFAULT_IGNORE = 'node_modules build dist .git bower_components logs .swp .nyc_output'

const DEFAULT_ARGUMENTS = {
  logLevel: 'fatal',
  prettyLogs: false,
  watch: false,
  verboseWatch: false,
  debug: false,
  debugPort: 9320,
  options: false,
  pluginTimeout: 10 * 1000, // everything should load in 10 seconds
  closeGraceDelay: 500,
  lang: 'js',
  standardlint: false,
  commonPrefix: false
}

const CLI_OPTIONS = {
  port: { type: 'string', short: 'p' },
  'inspect-port': { type: 'string' },
  'body-limit': { type: 'string' },
  'plugin-timeout': { type: 'string', short: 'T' },
  'close-grace-delay': { type: 'string', short: 'g' },
  'trust-proxy-hop': { type: 'string' },
  'log-level': { type: 'string', short: 'l' },
  address: { type: 'string', short: 'a' },
  socket: { type: 'string', short: 's' },
  prefix: { type: 'string', short: 'x' },
  'ignore-watch': { type: 'string' },
  'logging-module': { type: 'string', short: 'L' },
  'debug-host': { type: 'string' },
  lang: { type: 'string' },
  require: { type: 'string', short: 'r' },
  import: { type: 'string', short: 'i' },
  config: { type: 'string', short: 'c' },
  method: { type: 'string' },
  'trust-proxy-ips': { type: 'string' },
  'follow-watch': { type: 'string' },
  'pretty-logs': { type: 'boolean', short: 'P' },
  options: { type: 'boolean', short: 'o' },
  watch: { type: 'boolean', short: 'w' },
  'verbose-watch': { type: 'boolean', short: 'V' },
  debug: { type: 'boolean', short: 'd' },
  standardlint: { type: 'boolean' },
  'common-prefix': { type: 'boolean' },
  'include-hooks': { type: 'boolean' },
  'trust-proxy-enabled': { type: 'boolean' },
  help: { type: 'boolean', short: 'h' },
  'debug-port': { type: 'string', short: 'I' }
}

module.exports = function parseCliArgs (args) {
  loadEnvQuitely()
  const commandLineArguments = parseArgs(args, {
    populateRest: true,
    envPrefix: 'FASTIFY_',
    tokenize: true,
    coerceNumbers: ['port', 'inspect-port', 'body-limit', 'plugin-timeout', 'close-grace-delay', 'trust-proxy-hop', 'debug-port'],
    options: CLI_OPTIONS
  })

  const configFileOptions = commandLineArguments.config ? requireModule(commandLineArguments.config) : undefined

  const additionalArgs = commandLineArguments['--'] || []
  const pluginParsed = parseArgs(additionalArgs, { options: {}, strict: false })
  const { _, ...pluginOptions } = pluginParsed
  const ignoreWatchArg = commandLineArguments.ignoreWatch || configFileOptions?.ignoreWatch || ''
  const followWatchArg = commandLineArguments.followWatch || configFileOptions?.followWatch || ''
  let ignoreWatch = `${DEFAULT_IGNORE} ${ignoreWatchArg}`.trim()
  if (ignoreWatchArg.includes('.ts$')) {
    ignoreWatch = ignoreWatch.replace('dist', '')
  }

  // Merge objects from lower to higher priority
  const parsedArgs = { ...DEFAULT_ARGUMENTS, ...configFileOptions, ...commandLineArguments }

  // Set `trustProxy` with enabled taking precedence, followed by IPs and finally hop count
  const trustProxyEnabled = parsedArgs.trustProxyEnabled === undefined
    ? undefined
    : parsedArgs.trustProxyEnabled === true || parsedArgs.trustProxyEnabled === 'true'
  const trustProxy = trustProxyEnabled || parsedArgs.trustProxyIps || parsedArgs.trustProxyHop

  return {
    _: parsedArgs._,
    '--': additionalArgs,
    help: parsedArgs.help,
    port: parsedArgs.port,
    bodyLimit: parsedArgs.bodyLimit,
    pluginTimeout: parsedArgs.pluginTimeout,
    closeGraceDelay: parsedArgs.closeGraceDelay,
    pluginOptions,
    prettyLogs: parsedArgs.prettyLogs,
    options: parsedArgs.options,
    watch: parsedArgs.watch,
    debug: parsedArgs.debug,
    debugPort: parsedArgs.debugPort,
    debugHost: parsedArgs.debugHost,
    ignoreWatch,
    verboseWatch: parsedArgs.verboseWatch,
    logLevel: parsedArgs.logLevel,
    address: parsedArgs.address,
    socket: parsedArgs.socket,
    require: parsedArgs.require,
    import: parsedArgs.import,
    prefix: parsedArgs.prefix,
    loggingModule: parsedArgs.loggingModule,
    lang: parsedArgs.lang,
    method: parsedArgs.method,
    commonPrefix: parsedArgs.commonPrefix,
    includeHooks: parsedArgs.includeHooks,
    followWatch: followWatchArg,
    trustProxy
  }
}
