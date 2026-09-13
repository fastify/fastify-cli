'use strict'

const { test } = require('node:test')
const parseArgs = require('../lib/parse-args')

test('should work without an options map', t => {
  const parsed = parseArgs(['file.js', '--flag'], { populateRest: true })

  t.assert.strictEqual(parsed.flag, true)
  t.assert.deepStrictEqual(parsed._, ['file.js'])
  t.assert.deepStrictEqual(parsed['--'], [])
})

test('should reject unknown options in strict mode', t => {
  t.assert.throws(() => parseArgs(['--unknown', 'value'], { strict: true, options: {} }), /Unknown option/)
})
