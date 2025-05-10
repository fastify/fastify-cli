'use strict'

const { runFastify } = require('./start')

module.exports = {
  build (args, additionalOptions = {}, serverOptions = {}, module = undefined) {
    Object.defineProperty(additionalOptions, 'ready', {
      value: true,
      enumerable: false,
      writable: false
    })

    return runFastify(args, additionalOptions, serverOptions, module)
  },
  listen: runFastify
}
