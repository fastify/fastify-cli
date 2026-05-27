'use strict'

const fs = require('node:fs')
const path = require('node:path')
const url = require('node:url')
const semver = require('semver')
const pkgUp = require('pkg-up')
const resolveFrom = require('resolve-from')

const moduleSupport = semver.satisfies(process.version, '>= 14 || >= 12.17.0 < 13.0.0')

function exit (message) {
  if (message instanceof Error) {
    console.error(message)
    return process.exit(1)
  } else if (message) {
    console.warn(`Warn: ${message}`)
    return process.exit(1)
  }

  process.exit()
}

function requireModule (moduleName) {
  if (fs.existsSync(moduleName)) {
    const moduleFilePath = path.resolve(moduleName)
    return require(moduleFilePath)
  } else {
    return require(moduleName)
  }
}

async function requireESModule (moduleName) {
  if (fs.existsSync(moduleName)) {
    const moduleFilePath = path.resolve(moduleName)
    return import(url.pathToFileURL(moduleFilePath))
  } else {
    return import(moduleName)
  }
}

async function requireModuleDefaultExport (moduleName) {
  if (fs.existsSync(moduleName)) {
    const packageType = await getPackageType(path.dirname(moduleName))
    const type = getScriptType(moduleName, packageType)

    const moduleFilePath = path.resolve(moduleName)
    if (type === 'module') {
      return (await import(url.pathToFileURL(moduleFilePath))).default
    } else {
      return require(moduleFilePath)
    }
  } else {
    return (await import(moduleName)).default
  }
}

function requireFastifyForModule (modulePath) {
  try {
    const basedir = path.resolve(process.cwd(), modulePath)
    const module = require(resolveFrom.silent(basedir, 'fastify') || 'fastify')

    return { module }
  } catch (e) {
    exit('unable to load fastify module')
  }
}

function isInvalidAsyncPlugin (plugin) {
  return plugin && plugin.length !== 2 && plugin.constructor.name === 'AsyncFunction'
}

async function getPackageType (cwd) {
  const nearestPackage = await pkgUp({ cwd })
  if (nearestPackage) {
    return require(nearestPackage).type
  }
}

function getScriptType (fname, packageType) {
  const modulePattern = /\.mjs$/i
  const commonjsPattern = /\.cjs$/i
  return (modulePattern.test(fname) ? 'module' : commonjsPattern.test(fname) ? 'commonjs' : packageType) || 'commonjs'
}

async function requireServerPluginFromPath (modulePath) {
  const resolvedModulePath = path.resolve(process.cwd(), modulePath)

  if (!fs.existsSync(resolvedModulePath)) {
    throw new Error(`${resolvedModulePath} doesn't exist within ${process.cwd()}`)
  }

  const packageType = await getPackageType(resolvedModulePath)
  const type = getScriptType(resolvedModulePath, packageType)

  let serverPlugin
  if (type === 'module') {
    if (moduleSupport) {
      serverPlugin = await import(url.pathToFileURL(resolvedModulePath).href)
    } else {
      throw new Error(`fastify-cli cannot import plugin at '${resolvedModulePath}'. Your version of node does not support ES modules. To fix this error upgrade to Node 14 or use CommonJS syntax.`)
    }
  } else {
    serverPlugin = require(resolvedModulePath)
  }

  if (isInvalidAsyncPlugin(type === 'commonjs' ? serverPlugin : serverPlugin.default)) {
    throw new Error('Async/Await plugin function should contain 2 arguments. ' +
      'Refer to documentation for more information.')
  }

  return serverPlugin
}

function showHelpForCommand (commandName) {
  const helpFilePath = path.join(__dirname, 'help', `${commandName}.txt`)

  try {
    console.log(fs.readFileSync(helpFilePath, 'utf8'))
    exit()
  } catch (e) {
    exit(`unable to get help for command "${commandName}"`)
  }
}

function isKubernetes () {
  // Detection based on https://kubernetes.io/docs/reference/kubectl/#in-cluster-authentication-and-namespace-overrides
  return process.env.KUBERNETES_SERVICE_HOST !== undefined ||
    fs.existsSync('/run/secrets/kubernetes.io/serviceaccount/token')
}

module.exports = {
  isKubernetes,
  exit,
  requireModule,
  requireESModule,
  requireModuleDefaultExport,
  requireFastifyForModule,
  showHelpForCommand,
  requireServerPluginFromPath
}
