'use strict'

const chalk = require('chalk').default
const path = require('node:path')
const { DEFAULT_IGNORE } = require('./constants')
const ignoredDirectories = DEFAULT_IGNORE.split(' ').filter((entry) => entry !== '.swp')
const pathSeparator = '[/\\\\]'

const arrayToRegExp = (arr) => {
  const reg = arr.map((file) => {
    if (ignoredDirectories.includes(file)) {
      const literal = file.replace('.', '\\.')
      return `(?:^|${pathSeparator})${literal}(?=${pathSeparator}|$)`
    }
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
