'use strict'

const chalk = require('chalk')
const path = require('path')

const arrayToRegExp = (arr) => {
  const reg = arr.map((file) => {
    if (/^\./.test(file)) { return `\\${file}` }
    return file
  }).join('|')
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
