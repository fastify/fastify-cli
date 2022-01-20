'use strict'

const { runFastify } = require('./start')

module.exports = {
  build (args, additionalOptions = {}) {
    Object.defineProperty(additionalOptions, 'ready', {
      value: true,
      enumerable: false,
      writable: false
    })
    return runFastify(args, additionalOptions)
  },
  listen: runFastify
}
