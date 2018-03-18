'use strict'

const {
  readFile,
  writeFile
} = require('fs')
const chalk = require('chalk')
const path = require('path')
const generify = require('generify')
const minimist = require('minimist')
const templatedir = path.join(__dirname, 'app_template')
const cliPkg = require('./package')

function generate (dir, log, cb) {
  if (!cb) {
    cb = log
    log = () => {}
  }
  const pkgFile = path.join(dir, 'package.json')
  log('info', `reading package.json in ${dir}`)
  readFile(pkgFile, (err, data) => {
    if (err) {
      return cb(err)
    }

    var pkg
    try {
      pkg = JSON.parse(data)
    } catch (err) {
      return cb(err)
    }

    pkg.scripts.test = 'standard && tap test/*/*.test.js'
    pkg.scripts.start = 'fastify-cli app.js'
    pkg.scripts.colada = 'fastify-cli -l info -P app.js'

    pkg.dependencies = Object.assign(pkg.dependencies || {}, {
      'fastify': cliPkg.dependencies.fastify,
      'fastify-plugin': cliPkg.devDependencies['fastify-plugin'],
      'fastify-autoload': cliPkg.devDependencies['fastify-autoload'],
      'fastify-cli': '^' + cliPkg.version
    })

    pkg.devDependencies = Object.assign(pkg.devDependencies || {}, {
      'standard': cliPkg.devDependencies['standard'],
      'tap': cliPkg.devDependencies['tap']
    })

    log('debug', `edited package.json, saving`)

    writeFile(pkgFile, JSON.stringify(pkg), (err) => {
      if (err) {
        return cb(err)
      }

      log('debug', `saved package.json`)
      log('info', `copying sample project`)

      generify(templatedir, dir, {}, function (file) {
        log('debug', `generated ${file}`)
      }, function (err) {
        if (err) {
          return cb(err)
        }

        log('info', `project ${pkg.name} generated successfully`)
        log('debug', `run '${chalk.bold('npm install')}' to install the dependencies`)
        log('debug', `run '${chalk.bold('npm start')}' to start the application`)
        log('debug', `run '${chalk.bold('npm test')}' to execute the unit tests`)
        cb()
      })
    })
  })
}

const levels = {
  'debug': 0,
  'info': 1,
  'error': 2
}

const colors = [
  (l) => l,
  chalk.green,
  chalk.red
]

function cli (args) {
  const opts = minimist(args)
  generate(opts._[0] || process.cwd(), log, function (err) {
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
