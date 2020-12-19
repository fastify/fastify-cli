'use strict'

const path = require('path')
const generify = require('generify')
const log = require('./log')

function eject () {
  return new Promise((resolve, reject) => {
    generify(path.join(__dirname, 'templates', 'eject'), '.', {}, function (file) {
      log('debug', `generated ${file}`)
      resolve()
    }, function (err) {
      if (err) {
        return reject(err)
      }
    })
  })
}

function cli () {
  eject().catch(function (err) {
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
