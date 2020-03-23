'use strict'

const { readFileSync, existsSync } = require('fs')
const path = require('path')
const generify = require('generify')
const argv = require('yargs-parser')
const { execSync } = require('child_process')
const log = require('./log')

function toMarkdownList (a) {
  return a.map(d => `- ${d}`).join('\n')
}
function generate (dir, { pluginMeta, encapsulated, pluginFileName }) {
  process.chdir(dir)
  return new Promise((resolve, reject) => {
    if (!existsSync(path.join(dir, 'package.json'))) {
      execSync('npm init -y')
      log('info', `generated package.json in ${dir}`)
    }

    log('info', `reading package.json in ${dir}`)
    let pkg = readFileSync('package.json')
    try {
      pkg = JSON.parse(pkg)
    } catch (err) {
      return reject(err)
    }

    pluginMeta.decorators = pluginMeta.decorators ? pluginMeta.decorators : { fastify: [], reply: [] }
    pluginMeta.dependencies = pluginMeta.dependencies ? pluginMeta.dependencies : []

    const peerDepFastify = pkg.peerDependencies ? pkg.peerDependencies.fastify : ''
    const depFastify = pkg.dependencies ? pkg.dependencies.fastify : ''
    const minFastify = pluginMeta.fastify || peerDepFastify || depFastify

    let accessibilityTemplate = ''
    if (!encapsulated) {
      accessibilityTemplate = '- [X] Accessible in the same context where you require them\n- [ ] Accessible only in a child context\n'
    } else {
      accessibilityTemplate = '- [ ] Accessible in the same context where you require them\n- [X] Accessible only in a child context\n'
    }

    const fastifyDecorators = toMarkdownList(pluginMeta.decorators.fastify)
    const replyDecorators = toMarkdownList(pluginMeta.decorators.reply)
    const pluginDeps = toMarkdownList(pluginMeta.dependencies)

    generify(
      path.join(__dirname, 'templates', 'readme'),
      dir,
      {
        accessibilityTemplate,
        fastifyDecorators,
        replyDecorators,
        pluginDeps,
        packageName: pkg.name,
        pluginFileName,
        minFastify
      },
      function (file) {
        log('debug', `generated ${file}`)
      },
      function (err) {
        if (err) {
          return reject(err)
        }
        log('info', `README for plugin ${pkg.name} generated successfully`)
        resolve()
      }
    )
  })
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
    readFileSync(path.join(__dirname, 'help', 'readme.txt'), 'utf8')
  )
  return stop()
}

function cli (args) {
  const opts = argv(args)

  const dir = process.cwd()

  if (opts._.length !== 1) {
    log('error', 'Missing the required file parameter\n')
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

  const encapsulated = !plugin[Symbol.for('skip-override')]
  const pluginFileName = path.basename(opts._[0])

  generate(dir, { pluginMeta, encapsulated, pluginFileName }).catch(function (err) {
    if (err) {
      log('error', err.message)
      process.exit(1)
    }
  })
}

module.exports = {
  generate,
  cli
}

if (require.main === module) {
  cli(process.argv.slice(2))
}
