'use strict'

const { parseArgs } = require('node:util')

function camelCase (str) {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
}

function kebabCase (str) {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase()
}

function resolveEnvValue (envPrefix, optionName, type) {
  const envKey = `${envPrefix}${optionName.toUpperCase().replace(/-/g, '_')}`
  const envValue = process.env[envKey]
  if (envValue === undefined) return undefined
  if (type === 'boolean') {
    return envValue === 'true'
  }
  return envValue
}

// Normalize args so they work with util.parseArgs:
// - Convert camelCase option names to kebab-case
// - Handle --bool true -> --bool (remove value after boolean flags)
function normalizeArgs (args, options) {
  // Build lookup maps
  const boolKeys = new Set()
  const allKeys = new Map() // normalized key -> config
  for (const [key, cfg] of Object.entries(options)) {
    const kebab = kebabCase(key)
    allKeys.set(kebab, cfg)
    allKeys.set(key, cfg)
    if (cfg.type === 'boolean') {
      boolKeys.add(kebab)
      boolKeys.add(key)
    }
  }

  const normalized = []
  let i = 0
  while (i < args.length) {
    const arg = args[i]
    const strArg = String(arg)

    // Long option with = sign
    if (typeof arg === 'string' && strArg.startsWith('--') && strArg.includes('=')) {
      const eqIdx = strArg.indexOf('=')
      const key = strArg.slice(2, eqIdx)
      const val = strArg.slice(eqIdx + 1)
      const keyKebab = kebabCase(key)
      if (boolKeys.has(key)) {
        // --bool=value: drop the value, just use --bool
        normalized.push(`--${keyKebab}`)
      } else {
        // --key=value with inline value
        normalized.push(`--${keyKebab}=${String(val)}`)
      }
      i++
      continue
    }

    // Long option without = sign
    if (typeof arg === 'string' && strArg.startsWith('--')) {
      const key = strArg.slice(2)
      const keyKebab = kebabCase(key)
      if (boolKeys.has(key)) {
        // Boolean flag
        normalized.push(`--${keyKebab}`)
        i++
        // If next arg is a truthy/falsy value, consume it
        if (i < args.length && ['true', 'false', '1', '0'].includes(String(args[i]))) {
          i++
        }
      } else {
        // Non-boolean option: --key value
        normalized.push(`--${keyKebab}`)
        i++
        if (i < args.length) {
          // Convert to string because parseArgs requires string values
          normalized.push(String(args[i]))
          i++
        }
      }
      continue
    }

    // Short option group (-abc) or short option with value (-p 3000)
    if (typeof arg === 'string' && strArg.startsWith('-') && strArg.length > 1) {
      normalized.push(strArg)
      i++
      continue
    }

    // Positional argument (convert to string)
    normalized.push(String(arg))
    i++
  }

  return normalized
}

function parseArgsStandard (args, config) {
  const options = config.options || {}

  // Build full options map
  const fullOptions = {}
  for (const [key, cfg] of Object.entries(options)) {
    const kebab = kebabCase(key)
    const camel = camelCase(key)
    const opt = { type: cfg.type }
    if (cfg.short) {
      opt.short = cfg.short
    }
    fullOptions[kebab] = opt
    if (camel !== kebab) {
      fullOptions[camel] = { type: cfg.type }
    }
  }

  // Normalize args for strict parseArgs compatibility
  const normalizedArgs = normalizeArgs(args, options)

  const parsed = parseArgs({
    strict: config.strict !== false,
    allowPositionals: true,
    tokens: config.tokenize !== false,
    options: fullOptions,
    args: normalizedArgs
  })

  // Build flat result from values + positionals, converting keys to camelCase
  const result = {}
  for (const [key, value] of Object.entries(parsed.values)) {
    result[camelCase(key)] = value
  }

  // Handle -- separator (rest tokens)
  // When -- is present, everything after it becomes positionals
  // We split positionals into main positionals and rest positionals
  if (config.populateRest) {
    const rest = []
    const mainPositionals = []
    let inRest = false
    for (const token of parsed.tokens) {
      if (token.kind === 'option-terminator') {
        inRest = true
        continue
      }
      if (token.kind === 'positional') {
        if (inRest) {
          rest.push(token.original !== undefined ? token.original : token.value)
        } else {
          mainPositionals.push(token.value)
        }
      }
    }
    result._ = mainPositionals
    result['--'] = rest
  } else {
    result._ = parsed.positionals
  }

  // Merge environment variables
  if (config.envPrefix) {
    for (const [key, cfg] of Object.entries(options)) {
      const camelKey = camelCase(key)
      if (result[camelKey] !== undefined) continue
      const value = resolveEnvValue(config.envPrefix, kebabCase(key), cfg.type)
      if (value !== undefined) {
        result[camelKey] = value
      }
    }
  }

  // Coerce numbers
  if (config.coerceNumbers) {
    for (const numKey of config.coerceNumbers) {
      const camelKey = camelCase(numKey)
      if (result[camelKey] !== undefined && typeof result[camelKey] === 'string') {
        const n = Number(result[camelKey])
        if (!Number.isNaN(n)) {
          result[camelKey] = n
        }
      }
    }
  }

  return result
}

module.exports = parseArgsStandard
