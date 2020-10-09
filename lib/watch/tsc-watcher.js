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

  const configFile = require(resolve(process.cwd(), configPath))

  const appFile = join(resolve(dirname(configPath), configFile.compilerOptions.outDir), basename(opts._[0]).replace(/.ts$/, '.js'))
  args.splice(args.length - 1, 1, appFile)

  host.afterProgramCreate = program => {
    if (child) {
      child.send(GRACEFUL_SHUT)
    }
    origPostProgramCreate(program)

    child = cp.fork(forkPath, args, {
      cwd: process.cwd(),
      encoding: 'utf8'
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

module.exports = watchMain
