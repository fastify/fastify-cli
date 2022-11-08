'use strict'

const path = require('path')
const generify = require('generify')
const argv = require('yargs-parser')
const log = require('./log')

function eject (dir, template) {
  return new Promise((resolve, reject) => {
    generify(path.join(__dirname, 'templates', template), dir, {}, function (file) {
      log('debug', `generated ${file}`)
    }, function (err) {
      if (err) {
        return reject(err)
      }
      resolve()
    })
  })
}

function cli (args) {
  const opts = argv(args)

  let template
  if (opts.lang === 'ts' || opts.lang === 'typescript') {
    template = 'eject-ts'
  } else {
    if (opts.esm) {
      template = 'eject-esm'
    } else {
      template = 'eject'
    }
  }

  return eject(process.cwd(), template).catch(function (err) {
    if (err) {
      log('error', err.message)
      process.exit(1)
    }
  })
}

module.exports = {
  eject,
  cli
}

if (require.main === module) {
  cli()
}
