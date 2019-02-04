'use strict'

const path = require('path')
// const t = require('tap')
const { generate } = require('../generate-readme')

const plugindir = path.join(__dirname, 'plugindir')
let plugin = require(plugindir)

const pluginMeta = plugin[Symbol.for('plugin-meta')]
let encapsulated = !plugin[Symbol.for('skip-override')]
const pluginFileName = path.basename(plugindir)

generate(plugindir, { pluginMeta, encapsulated, pluginFileName }, function () {

})
