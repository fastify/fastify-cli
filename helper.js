'use strict'

const { runFastify } = require('./start')

module.exports = {
  build (args, additionalOptions = {}, serverOptions = {}, buildOptions = {}) {
    Object.defineProperty(additionalOptions, 'ready', {
      value: true,
      enumerable: false,
      writable: false
    })

    const buildOpts = {
      skipOverride: true,
      ...buildOptions
    }

    return runFastify(args, additionalOptions, serverOptions, buildOpts)
  },
  listen: runFastify
}
