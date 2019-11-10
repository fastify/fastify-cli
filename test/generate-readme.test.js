'use strict'

const path = require('path')
const fs = require('fs')
const t = require('tap')
const rimraf = require('rimraf')
const { generate } = require('../generate-readme')

const plugindir = path.join(__dirname, 'plugindir')
const plugin = require(plugindir)
const { test } = t

test('should create readme', t => {
  t.plan(1)
  const pluginMeta = plugin[Symbol.for('plugin-meta')]
  const encapsulated = !plugin[Symbol.for('skip-override')]
  const pluginFileName = path.basename(plugindir)
  generate(plugindir, { pluginMeta, encapsulated, pluginFileName }, function (err) {
    if (err) {
      t.error(err)
    }
    const readme = path.join(plugindir, 'README.md')
    t.ok(fs.existsSync(readme))
    rimraf(readme, () => t.end())
  })
})
