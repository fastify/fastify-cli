'use strict'

const chalk = require('chalk')
const path = require('node:path')

const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const arrayToRegExp = (arr) => {
  const reg = arr.map((file) => escapeRegExp(file)).join('|')
  return new RegExp(`(${reg})`)
}

const logWatchVerbose = (event, filepath) => {
  const relativeFilepath = path.relative(process.cwd(), filepath)
  console.log(
    chalk.gray(
      `[fastify-cli] watch - '${event}' occurred on '${relativeFilepath}'`
    )
  )
}

module.exports = {
  arrayToRegExp,
  logWatchVerbose
}
