'use strict'

const messages = []

function noop () {}

const loggerInstance = {
  level: 'info',
  messages,
  info (msg) { messages.push(msg) },
  error: noop,
  debug: noop,
  fatal: noop,
  warn: noop,
  trace: noop,
  child () { return this }
}

module.exports = function (fastify, options, next) {
  next()
}

module.exports.options = {
  loggerInstance
}
