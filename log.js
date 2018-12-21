'use strict'

const chalk = require('chalk')

const levels = {
  debug: 0,
  info: 1,
  error: 2
}

const colors = [l => l, chalk.green, chalk.red]

function log (severity, line) {
  const level = levels[severity] || 0
  if (level === 1) {
    line = '--> ' + line
  }
  console.log(colors[level](line))
}

module.exports = log
