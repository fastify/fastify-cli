'use strict'

const path = require('path')
const fs = require('fs')
const t = require('tap')
const rimraf = require('rimraf')
const { generate } = require('../generate-readme')

const plugindir = path.join(__dirname, 'plugindir')
let plugin = require(plugindir)
const { test } = t

test('should create readme', async (t) => {
  t.plan(1)
  const pluginMeta = plugin[Symbol.for('plugin-meta')]
  let encapsulated = !plugin[Symbol.for('skip-override')]
  const pluginFileName = path.basename(plugindir)
  try {
    await generate(plugindir, { pluginMeta, encapsulated, pluginFileName })
    let readme = path.join(plugindir, 'README.md')
    t.ok(fs.existsSync(readme))
    rimraf(readme, () => t.end())
  } catch (err) {
    t.error(err)
  }
})
