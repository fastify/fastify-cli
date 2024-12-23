'use strict'

module.exports = require('neostandard')({
  ignores: [
    ...require('neostandard').resolveIgnoresFromGitignore(),
    'test/data/parsing-error.js',
    'test/data/undefinedVariable.js',
  ],
  ts: true
})
