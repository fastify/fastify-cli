const fs = require('fs')
const path = require('path')
const url = require('url')
const semver = require('semver')
const resolveFrom = require('resolve-from')

const moduleSupport = semver.satisfies(process.version, '>= 14 || >= 12.17.0 < 13.0.0')

function exit (message) {
  if (message instanceof Error) {
    console.log(message)
    return process.exit(1)
  } else if (message) {
    console.log(`Warn: ${message}`)
    return process.exit(1)
  }

  process.exit()
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
  return plugin.length !== 2 && plugin.constructor.name === 'AsyncFunction'
}

async function requireServerPluginFromPath (modulePath) {
  const resolvedModulePath = path.resolve(process.cwd(), modulePath)

  if (!fs.existsSync(resolvedModulePath)) {
    throw new Error(`${resolvedModulePath} doesn't exist within ${process.cwd()}`)
  }

  const modulePattern = /\.mjs$/i
  let serverPlugin
  if (modulePattern.test(modulePath)) {
    if (moduleSupport) {
      serverPlugin = (await import(url.pathToFileURL(resolvedModulePath).href)).default
    } else {
      throw new Error(`fastify-cli cannot import plugin at '${resolvedModulePath}'. Your version of node does not support ES modules. To fix this error upgrade to Node 14 or use CommonJS syntax.`)
    }
  } else {
    serverPlugin = require(resolvedModulePath)
  }

  if (isInvalidAsyncPlugin(serverPlugin)) {
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

module.exports = { exit, requireFastifyForModule, showHelpForCommand, requireServerPluginFromPath }
