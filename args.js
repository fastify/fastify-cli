'use strict'

const argv = require('yargs-parser')
const dotenv = require('dotenv')
const { requireModule } = require('./util')

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

module.exports = function parseArgs (args) {
  dotenv.config()
  const commandLineArguments = argv(args, {
    configuration: {
      'populate--': true
    },
    number: ['port', 'inspect-port', 'body-limit', 'plugin-timeout', 'close-grace-delay', 'trust-proxy-hop'],
    string: ['log-level', 'address', 'socket', 'prefix', 'ignore-watch', 'logging-module', 'debug-host', 'lang', 'require', 'import', 'config', 'method', 'trust-proxy-ips'],
    boolean: ['pretty-logs', 'options', 'watch', 'verbose-watch', 'debug', 'standardlint', 'common-prefix', 'include-hooks', 'trust-proxy-enabled'],
    envPrefix: 'FASTIFY_',
    alias: {
      port: ['p'],
      socket: ['s'],
      help: ['h'],
      config: ['c'],
      options: ['o'],
      address: ['a'],
      watch: ['w'],
      prefix: ['x'],
      require: ['r'],
      import: ['i'],
      debug: ['d'],
      'debug-port': ['I'],
      'log-level': ['l'],
      'pretty-logs': ['P'],
      'plugin-timeout': ['T'],
      'close-grace-delay': ['g'],
      'logging-module': ['L'],
      'verbose-watch': ['V']
    }
  })

  const configFileOptions = commandLineArguments.config ? requireModule(commandLineArguments.config) : undefined

  const additionalArgs = commandLineArguments['--'] || []
  const { _, ...pluginOptions } = argv(additionalArgs)
  const ignoreWatchArg = commandLineArguments.ignoreWatch || configFileOptions?.ignoreWatch || ''

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
    trustProxy
  }
}
