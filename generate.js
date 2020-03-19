'use strict'

const {
  readFile,
  writeFile,
  existsSync
} = require('fs')
const path = require('path')
const chalk = require('chalk')
const generify = require('generify')
const argv = require('yargs-parser')
const cliPkg = require('./package')
const { execSync } = require('child_process')
const log = require('./log')

function generate (dir, cb) {
  generify(path.join(__dirname, 'templates', 'app'), dir, {}, function (file) {
    log('debug', `generated ${file}`)
  }, function (err) {
    if (err) {
      return cb(err)
    }

    process.chdir(dir)
    execSync('npm init -y')

    log('info', `reading package.json in ${dir}`)
    readFile('package.json', (err, data) => {
      if (err) {
        return cb(err)
      }

      var pkg
      try {
        pkg = JSON.parse(data)
      } catch (err) {
        return cb(err)
      }

      pkg.main = 'app.js'

      pkg.scripts = Object.assign(pkg.scripts || {}, {
        test: 'tap test/**/*.test.js',
        start: 'fastify start -l info app.js',
        dev: 'fastify start -w -l info -P app.js'
      })

      pkg.dependencies = Object.assign(pkg.dependencies || {}, {
        fastify: cliPkg.dependencies.fastify,
        'fastify-plugin': cliPkg.devDependencies['fastify-plugin'] || cliPkg.dependencies['fastify-plugin'],
        'fastify-autoload': cliPkg.devDependencies['fastify-autoload'],
        'fastify-cli': '^' + cliPkg.version
      })

      pkg.devDependencies = Object.assign(pkg.devDependencies || {}, {
        tap: cliPkg.devDependencies.tap
      })

      log('debug', 'edited package.json, saving')
      writeFile('package.json', JSON.stringify(pkg, null, 2), (err) => {
        if (err) {
          return cb(err)
        }

        log('debug', 'saved package.json')
        log('info', `project ${pkg.name} generated successfully`)
        log('debug', `run '${chalk.bold('npm install')}' to install the dependencies`)
        log('debug', `run '${chalk.bold('npm start')}' to start the application`)
        log('debug', `run '${chalk.bold('npm run dev')}' to start the application with pino-colada pretty logging (not suitable for production)`)
        log('debug', `run '${chalk.bold('npm test')}' to execute the unit tests`)
        cb()
      })
    })
  })
}

function cli (args) {
  const opts = argv(args)
  const dir = opts._[0]

  if (dir && existsSync(dir)) {
    if (dir !== '.' && dir !== './') {
      log('error', 'directory ' + opts._[0] + ' already exists')
      process.exit(1)
    }
  }
  if (dir === undefined) {
    log('error', 'must specify a directory to \'fastify generate\'')
    process.exit(1)
  }

  if (existsSync(path.join(dir, 'package.json'))) {
    log('error', 'a package.json file already exists in target directory')
    process.exit(1)
  }

  generate(dir, function (err) {
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
