const fs = require('fs')
const path = require('path')

const resolveFrom = require('resolve-from')

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
    const pkg = require(resolveFrom.silent(basedir, 'fastify/package.json') || 'fastify/package.json')

    return { module, pkg }
  } catch (e) {
    exit('unable to load fastify module')
  }
}

function isInvalidCallbackPlugin (plugin) {
  return plugin.length !== 3 && plugin.constructor.name === 'Function'
}

function isInvalidAsyncPlugin (plugin) {
  return plugin.length !== 2 && plugin.constructor.name === 'AsyncFunction'
}

function requireServerPluginFromPath (modulePath) {
  const resolvedModulePath = path.resolve(process.cwd(), modulePath)

  if (!fs.existsSync(resolvedModulePath)) {
    throw new Error(`${resolvedModulePath} doesn't exist within ${process.cwd()}`)
  }

  const serverPlugin = require(resolvedModulePath)

  if (isInvalidCallbackPlugin(serverPlugin)) {
    throw new Error('Plugin function should contain 3 arguments. Refer to ' +
      'documentation for more information.')
  }

  if (isInvalidAsyncPlugin(serverPlugin)) {
    return new Error('Async/Await plugin function should contain 2 arguments.' +
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
