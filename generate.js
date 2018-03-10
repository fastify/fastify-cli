'use strict'

const minimist = require('minimist')

function generate (opts) {
  console.log('NOT IMPLEMENTED YET')
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
