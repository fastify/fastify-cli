'use strict'

const { runFastify } = require('./start')

module.exports = {
  build (args, additionalOptions = {}, serverOptions = {}) {
    Object.defineProperty(additionalOptions, 'ready', {
      value: true,
      enumerable: false,
      writable: false
    })
    return runFastify(args, additionalOptions, serverOptions)
  },
  listen: runFastify
}
