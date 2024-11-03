'use strict'

const { arrayToRegExp } = require('../lib/watch/utils')

const { test } = require('node:test')

test('should equal expect RegExp', t => {
  t.plan(1)

  const expectRegExp = /(node_modules|build|dist|\.git|bower_components|logs)/
  const regExp = arrayToRegExp(['node_modules', 'build', 'dist', '.git', 'bower_components', 'logs'])

  t.assert.deepStrictEqual(regExp, expectRegExp)
})
