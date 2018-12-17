'use strict'

const { readFileSync, existsSync } = require('fs')
const chalk = require('chalk')
const path = require('path')
const generify = require('generify')
const argv = require('yargs-parser')
const { execSync } = require('child_process')

function toMarkdownList (a) {
  return a.map(d => `- ${d}`).join('\n')
}
function generate (dir, { pluginMeta, encapsulated, pluginFileName }, log, cb) {
  if (!cb) {
    cb = log
    log = () => {}
  }

  process.chdir(dir)

  if (!existsSync(path.join(dir, 'package.json'))) {
    execSync('npm init -y')
    log('info', `generated package.json in ${dir}`)
  }

  log('info', `reading package.json in ${dir}`)
  let pkg = readFileSync('package.json')
  try {
    pkg = JSON.parse(pkg)
  } catch (err) {
    return cb(err)
  }

  pluginMeta.decorators = pluginMeta.decorators ? pluginMeta.decorators : { fastify: [], reply: [] }
  pluginMeta.dependencies = pluginMeta.dependencies ? pluginMeta.dependencies : []

  let accessibilityTemplate = ''
  if (!encapsulated) {
    accessibilityTemplate = `- [X] Accessible in the same context where you require them\n- [ ] Accessible only in a child context\n`
  } else {
    accessibilityTemplate = `- [ ] Accessible in the same context where you require them\n- [X] Accessible only in a child context\n`
  }

  let fastifyDecorators = toMarkdownList(pluginMeta.decorators.fastify)
  let replyDecorators = toMarkdownList(pluginMeta.decorators.reply)
  let pluginDeps = toMarkdownList(pluginMeta.dependencies)

  generify(
    path.join(__dirname, 'templates', 'readme'),
    dir,
    {
      accessibilityTemplate,
      fastifyDecorators,
      replyDecorators,
      pluginDeps,
      packageName: pkg.name,
      pluginFileName
    },
    function (file) {
      log('debug', `generated ${file}`)
    },
    function (err) {
      if (err) {
        return cb(err)
      }

      log('info', `README for plugin ${pkg.name} generated successfully`)
    }
  )
}

function stop (error) {
  if (error) {
    console.log(error)
    process.exit(1)
  }
  process.exit()
}

function showHelp () {
  console.log(
    readFileSync(path.join(__dirname, 'help', 'generate-plugin.txt'), 'utf8')
  )
  return stop()
}

const levels = {
  debug: 0,
  info: 1,
  error: 2
}

const colors = [l => l, chalk.green, chalk.red]

function cli (args) {
  const opts = argv(args)

  const dir = process.cwd()

  if (opts._.length !== 1) {
    log('error', 'Error: Missing the required file parameter\n')
    return showHelp()
  }

  if (existsSync(path.join(dir, 'README.md'))) {
    log('error', 'a README.md file already exists in target directory')
    process.exit(1)
  }

  const pluginPath = path.join(dir, path.basename(opts._[0], '.js'))

  let plugin
  try {
    plugin = require(pluginPath)
  } catch (err) {
    log('error', 'plugin could not be loaded', err)
    process.exit(1)
  }

  const pluginMeta = plugin[Symbol.for('plugin-meta')]

  if (!pluginMeta) {
    log('error', 'no plugin metadata could be found. Are you sure that you use https://github.com/fastify/fastify-plugin ?')
    process.exit(1)
  }

  let encapsulated = !plugin[Symbol.for('skip-override')]
  const pluginFileName = path.basename(opts._[0])

  generate(dir, { pluginMeta, encapsulated, pluginFileName }, log, function (
    err
  ) {
    if (err) {
      log('error', err.message)
      process.exit(1)
    }
  })

  function log (severity, line) {
    const level = levels[severity] || 0
    if (level === 1) {
      line = '--> ' + line
    }
    console.log(colors[level](line))
  }
}

module.exports = {
  generate,
  cli
}

if (require.main === module) {
  cli(process.argv.slice(2))
}
