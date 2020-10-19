'use strict'

const ts = require('typescript')
const { EventEmitter } = require('events')
const formatHost = {
  getCanonicalFileName: path => path,
  getCurrentDirectory: ts.sys.getCurrentDirectory,
  getNewLine: () => ts.sys.newLine
}
const { resolve, join, basename, dirname } = require('path')
const cp = require('child_process')
const forkPath = join(__dirname, './fork.js')
const {
  GRACEFUL_SHUT
} = require('./constants')
let child

const emitter = new EventEmitter()

function watchMain (args, opts) {
  const configPath = ts.findConfigFile(
    './',
    ts.sys.fileExists,
    opts.tsconfig || 'tsconfig.json'
  )

  if (!configPath) {
    throw new Error('Could not find a valid \'tsconfig.json\'.')
  }

  const createProgram = ts.createSemanticDiagnosticsBuilderProgram

  const host = ts.createWatchCompilerHost(
    configPath,
    {},
    ts.sys,
    createProgram,
    reportDiagnostic,
    reportWatchStatusChanged
  )

  const origCreateProgram = host.createProgram
  host.createProgram = (rootNames, options, host, oldProgram) => {
    return origCreateProgram(rootNames, options, host, oldProgram)
  }
  const origPostProgramCreate = host.afterProgramCreate

  const configFile = requireTsConfig(resolve(process.cwd(), configPath))

  const appFile = join(resolve(dirname(configPath), configFile.compilerOptions.outDir), basename(opts._[0]).replace(/.ts$/, '.js'))
  args.splice(args.length - 1, 1, appFile)

  host.afterProgramCreate = program => {
    if (child) {
      child.send(GRACEFUL_SHUT)
    }
    origPostProgramCreate(program)

    // We need to set the NODE_PATH variable in case node_modules are in a child directory
    const env = Object.assign({}, process.env, { NODE_PATH: resolve(process.cwd(), 'node_modules') })
    child = cp.fork(forkPath, args, {
      cwd: process.cwd(),
      encoding: 'utf8',
      env
    })
    let readyEmitted = false

    child.on('message', (event) => {
      const { type, err } = event
      if (err) {
        child.emit('error', err)
        return null
      }

      if (type === 'ready') {
        if (readyEmitted) {
          return
        }

        readyEmitted = true
      }

      emitter.emit(type, err)
    })
  }

  ts.createWatchProgram(host)

  return emitter
}

emitter.on('close', () => {
  if (child) {
    child.kill()
    process.exit(0)
  }
})

function reportDiagnostic (diagnostic) {
  console.log('Error', diagnostic.code, ':', ts.flattenDiagnosticMessageText(diagnostic.messageText, formatHost.getNewLine()))
}

function reportWatchStatusChanged (diagnostic) {
  console.info(ts.formatDiagnostic(diagnostic, formatHost))
}

function requireTsConfig (configPath) {
  const isModule = basename(configPath) === configPath
  let configFile = require(isModule ? configPath : resolve(process.cwd(), configPath))
  const parent = configFile.extends
  if (configFile.compilerOptions.outDir) {
    configFile.compilerOptions.outDir = resolve(dirname(configPath), configFile.compilerOptions.outDir)
  }
  if (parent) {
    configFile = deepMergeConfig(requireTsConfig(parent), configFile)
  }
  return configFile
}

function deepMergeConfig (obj1, obj2) {
  const result = Object.assign({}, obj1, obj2)
  for (const key of Object.keys(result)) {
    if (typeof result[key] === 'object' && !Array.isArray(result[key])) {
      result[key] = deepMergeConfig(obj1[key], obj2[key])
      continue
    }
  }
  return result
}

module.exports = watchMain
