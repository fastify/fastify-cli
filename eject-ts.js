'use strict'

const path = require('path')
const generify = require('generify')
const log = require('./log')

function eject (dir) {
  return new Promise((resolve, reject) => {
    generify(
      path.join(__dirname, 'templates', 'eject-ts'),
      dir,
      {},
      function (file) {
        log('debug', `generated ${file}`)
      },
      function (err) {
        if (err) {
          return reject(err)
        }
        resolve()
      }
    )
  })
}

function cli () {
  eject(process.cwd()).catch(function (err) {
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
