#! /usr/bin/env node

'use strict'

const path = require('path')
const commist = require('commist')()
const help = require('help-me')({
  // the default
  dir: path.join(path.dirname(require.main.filename), 'help')
})
const start = require('./start')

commist.register('start', start.cli)
commist.register('help', help.toStdout)
commist.register('version', function () {
  console.log(require('./package.json').version)
})

const res = commist.parse(process.argv.splice(2))

if (res) {
  // no command was recognized
  help.toStdout(res)
}
