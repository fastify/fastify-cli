'use strict'

const path = require('node:path')
const { arrayToRegExp } = require('../lib/watch/utils')
const watch = require('../lib/watch')

const { test } = require('node:test')

test('should equal expect RegExp', t => {
  t.plan(1)

  const expectRegExp = /(node_modules|build|dist|\.git|bower_components|logs)/
  const regExp = arrayToRegExp(['node_modules', 'build', 'dist', '.git', 'bower_components', 'logs'])

  t.assert.deepStrictEqual(regExp, expectRegExp)
})

test('should return emitter when called with watchPaths', t => {
  t.plan(2)

  const pluginPath = path.join(__dirname, 'plugindir', 'plugin.js')
  const emitter = watch([pluginPath], 'node_modules', false, ['lib'])

  t.assert.equal(typeof emitter.stop, 'function')
  t.assert.equal(typeof emitter.on, 'function')

  emitter.stop()
})
