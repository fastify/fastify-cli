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
// - Handle boolean options that use yargs-parser's explicit value syntax
// - Preserve values for unknown plugin options
function normalizeArgs (args, options) {
  const boolKeys = new Set()
  const allKeys = new Map()
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
  const booleanValues = new Map()
  let i = 0
  while (i < args.length) {
    const arg = args[i]
    const strArg = String(arg)

    if (strArg === '--') {
      normalized.push(strArg)
      i++
      continue
    }

    // Long option with = sign
    if (typeof arg === 'string' && strArg.startsWith('--') && strArg.includes('=')) {
      const eqIdx = strArg.indexOf('=')
      const key = strArg.slice(2, eqIdx)
      const val = strArg.slice(eqIdx + 1)
      const keyKebab = kebabCase(key)
      if (boolKeys.has(key) || boolKeys.has(keyKebab)) {
        booleanValues.set(keyKebab, !['false', '0'].includes(val))
        normalized.push(`--${keyKebab}`)
      } else {
        normalized.push(`--${keyKebab}=${String(val)}`)
      }
      i++
      continue
    }

    // Long option without = sign
    if (typeof arg === 'string' && strArg.startsWith('--')) {
      const key = strArg.slice(2)
      const keyKebab = kebabCase(key)
      if (boolKeys.has(key) || boolKeys.has(keyKebab)) {
        normalized.push(`--${keyKebab}`)
        booleanValues.set(keyKebab, true)
        i++
        if (i < args.length && ['true', 'false', '1', '0'].includes(String(args[i]))) {
          const value = String(args[i])
          booleanValues.set(keyKebab, !['false', '0'].includes(value))
          i++
        }
      } else {
        const known = allKeys.has(key) || allKeys.has(keyKebab)
        normalized.push(`--${keyKebab}`)
        i++
        if (i < args.length) {
          const next = String(args[i])
          const isOption = next === '--' || (next.startsWith('--') && next.length > 2) || (next.startsWith('-') && !/^-\d/.test(next))
          if (!isOption) {
            if (known) {
              normalized.push(next)
            } else {
              normalized[normalized.length - 1] = `--${keyKebab}=${next}`
            }
            i++
          }
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

    normalized.push(String(arg))
    i++
  }

  return { args: normalized, booleanValues }
}

function parseArgsStandard (args, config) {
  const inputArgs = Array.isArray(args)
    ? args
    : String(args).trim().split(/\s+/).filter(Boolean)
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
  const normalized = normalizeArgs(inputArgs, options)

  const parsed = parseArgs({
    strict: config.strict !== false,
    allowPositionals: true,
    tokens: config.tokenize !== false,
    options: fullOptions,
    args: normalized.args
  })

  // Build flat result from values + positionals, converting keys to camelCase
  const result = {}
  for (const [key, value] of Object.entries(parsed.values)) {
    result[camelCase(key)] = value
  }
  for (const [key, value] of normalized.booleanValues) {
    result[camelCase(key)] = value
  }

  // Handle -- separator (rest tokens)
  // When -- is present, everything after it becomes positionals
  // We split positionals into main positionals and rest positionals
  if (config.populateRest) {
    const rest = []
    const mainPositionals = []
    const separatorIndex = inputArgs.indexOf('--')
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
    result['--'] = separatorIndex === -1 ? rest : inputArgs.slice(separatorIndex + 1)
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
