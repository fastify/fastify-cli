'use strict'

const path = require('node:path')
const fs = require('node:fs')
const { test } = require('node:test')
const rimraf = require('rimraf')
const { generate } = require('../generate-readme')

const plugindir = path.join(__dirname, 'plugindir')
const plugin = require(plugindir)

test('should create readme', async (t) => {
  t.plan(1)
  const pluginMeta = plugin[Symbol.for('plugin-meta')]
  const encapsulated = !plugin[Symbol.for('skip-override')]
  const pluginFileName = path.basename(plugindir)
  try {
    await generate(plugindir, { pluginMeta, encapsulated, pluginFileName })
    const readme = path.join(plugindir, 'README.md')
    t.assert.ok(fs.existsSync(readme))
    rimraf.sync(readme)
  } catch (err) {
    t.assert.ifError(err)
  }
})
