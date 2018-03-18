'use strict'

const {
  readFile,
  writeFile
} = require('fs')
const path = require('path')
// const generify = require('generify')
const minimist = require('minimist')

function generate (dir, cb) {
  const pkgFile = path.join(dir, 'package.json')
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

    pkg.scripts.test = 'standard | snazzy && tap test/*/*.test.js'
    pkg.scripts.start = 'fastify-cli app.js'
    pkg.scripts.colada = 'fastify-cli -l info -P app.js'

    writeFile(pkgFile, JSON.stringify(pkg), (err) => {
      if (err) {
        return cb(err)
      }

      cb()
    })
  })
}

function cli (args) {
  generate(minimist(args, {
  }))
}

module.exports = {
  generate,
  cli
}

if (require.main === module) {
  cli(process.argv.slice(2))
}
