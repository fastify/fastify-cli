'use strict'

const {
  readFile
} = require('fs')
const chalk = require('chalk')
const path = require('path')
const generify = require('generify')
const argv = require('yargs-parser')

function generate (dir, log, cb) {
  if (!cb) {
    cb = log
    log = () => {}
  }

  generify(path.join(__dirname, 'templates', 'readme'), dir, {}, function (file) {
    log('debug', `generated ${file}`)
  }, function (err) {
    if (err) {
      return cb(err)
    }

    process.chdir(dir)
    // execSync('npm init -y')

    log('info', `reading package.json in ${dir}`)
    readFile('package.json', (err, data) => {
      if (err) {
        return cb(err)
      }
      cb()
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
  const opts = argv(args)

  const dir = opts._[0] || process.cwd()

  generate(dir, log, function (err) {
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
