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

const FALSY_VALUES = new Set(['false', '0'])
const TRUTHY_VALUES = new Set(['true', '1'])

// Normalize args so they work with util.parseArgs:
// - Convert camelCase option names to kebab-case
// - Handle --bool true -> --bool and --bool false / --bool=false -> explicit false
// - In non-strict mode, let unknown options consume the following value
//   (--hello world -> --hello=world) to match the previous yargs-parser behavior
function normalizeArgs (args, options, strict) {
  // Build lookup maps
  const boolKeys = new Set()
  const knownKeys = new Set()
  const shortToKey = new Map()
  for (const [key, cfg] of Object.entries(options)) {
    const kebab = kebabCase(key)
    knownKeys.add(kebab)
    knownKeys.add(key)
    if (cfg.type === 'boolean') {
      boolKeys.add(kebab)
      boolKeys.add(key)
    }
    if (cfg.short) {
      shortToKey.set(cfg.short, kebab)
    }
  }

  const normalized = []
  // Boolean options explicitly set to false (util.parseArgs cannot express them)
  const explicitFalse = new Set()

  function pushBoolean (keyKebab, value) {
    if (value === undefined || TRUTHY_VALUES.has(value)) {
      normalized.push(`--${keyKebab}`)
    } else {
      explicitFalse.add(keyKebab)
    }
  }

  let i = 0
  while (i < args.length) {
    const arg = args[i]
    const strArg = String(arg)

    // Option terminator: everything after it is passed through untouched
    if (strArg === '--') {
      for (; i < args.length; i++) {
        normalized.push(String(args[i]))
      }
      break
    }

    // Long option with = sign
    if (typeof arg === 'string' && strArg.startsWith('--') && strArg.includes('=')) {
      const eqIdx = strArg.indexOf('=')
      const key = strArg.slice(2, eqIdx)
      const val = strArg.slice(eqIdx + 1)
      const keyKebab = kebabCase(key)
      if (boolKeys.has(key)) {
        pushBoolean(keyKebab, val)
      } else {
        // --key=value with inline value
        normalized.push(`--${keyKebab}=${val}`)
      }
      i++
      continue
    }

    // Long option without = sign
    if (typeof arg === 'string' && strArg.startsWith('--') && strArg.length > 2) {
      const key = strArg.slice(2)
      const keyKebab = kebabCase(key)
      i++
      const next = i < args.length ? String(args[i]) : undefined
      if (boolKeys.has(key)) {
        // Boolean flag, optionally followed by an explicit true/false value
        if (next !== undefined && (TRUTHY_VALUES.has(next) || FALSY_VALUES.has(next))) {
          pushBoolean(keyKebab, next)
          i++
        } else {
          pushBoolean(keyKebab)
        }
      } else if (knownKeys.has(key)) {
        // Non-boolean option: --key value
        normalized.push(`--${keyKebab}`)
        if (next !== undefined) {
          // Convert to string because parseArgs requires string values
          normalized.push(next)
          i++
        }
      } else if (!strict && next !== undefined && !next.startsWith('-')) {
        // Unknown option followed by a value: --hello world -> --hello=world
        normalized.push(`--${keyKebab}=${next}`)
        i++
      } else {
        // Unknown option without a value
        normalized.push(`--${keyKebab}`)
      }
      continue
    }

    // Short option group (-abc) or short option with value (-p 3000)
    if (typeof arg === 'string' && strArg.startsWith('-') && strArg.length > 1 && strArg !== '--') {
      i++
      const keyKebab = strArg.length === 2 ? shortToKey.get(strArg[1]) : undefined
      const next = i < args.length ? String(args[i]) : undefined
      if (keyKebab !== undefined && boolKeys.has(keyKebab) &&
        next !== undefined && (TRUTHY_VALUES.has(next) || FALSY_VALUES.has(next))) {
        // Short boolean alias followed by an explicit true/false value
        pushBoolean(keyKebab, next)
        i++
      } else {
        normalized.push(strArg)
      }
      continue
    }

    // Positional argument (convert to string)
    normalized.push(strArg)
    i++
  }

  return { normalized, explicitFalse }
}

// Split a command line string into tokens, honoring single and double quotes
// (yargs-parser accepted strings as well as arrays)
function tokenizeString (str) {
  const tokens = []
  let current = ''
  let quote = null
  let hasToken = false
  for (const ch of str) {
    if (quote) {
      if (ch === quote) {
        quote = null
      } else {
        current += ch
      }
    } else if (ch === '"' || ch === "'") {
      quote = ch
      hasToken = true
    } else if (/\s/.test(ch)) {
      if (hasToken) {
        tokens.push(current)
        current = ''
        hasToken = false
      }
    } else {
      current += ch
      hasToken = true
    }
  }
  if (hasToken) tokens.push(current)
  return tokens
}

function parseArgsStandard (args, config) {
  const options = config.options || {}
  if (typeof args === 'string') {
    args = tokenizeString(args)
  }

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

  // Like yargs-parser, unknown options are accepted unless explicitly requested
  const strict = config.strict === true

  // Normalize args for parseArgs compatibility
  const { normalized: normalizedArgs, explicitFalse } = normalizeArgs(args, options, strict)

  const parsed = parseArgs({
    strict,
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
  for (const key of explicitFalse) {
    result[camelCase(key)] = false
  }

  // Repeated string options (e.g. -r a -r b) become arrays, like yargs-parser did
  if (parsed.tokens) {
    const repeated = new Map()
    for (const token of parsed.tokens) {
      if (token.kind === 'option' && token.value !== undefined) {
        const camelKey = camelCase(token.name)
        if (!repeated.has(camelKey)) repeated.set(camelKey, [])
        repeated.get(camelKey).push(token.value)
      }
    }
    for (const [camelKey, values] of repeated) {
      if (values.length > 1) {
        result[camelKey] = values
      }
    }
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
