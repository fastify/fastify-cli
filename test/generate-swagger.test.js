'use strict'

const path = require('node:path')
const { test } = require('node:test')
const { generateSwagger } = require('../generate-swagger')

const swaggerplugindir = path.join(__dirname, 'swaggerplugindir')
const swaggerplugin = path.join(swaggerplugindir, 'plugin.js')

test('should generate swagger', async (t) => {
  t.plan(1)

  try {
    const swagger = JSON.parse(await generateSwagger([swaggerplugin]))
    t.assert.equal(swagger.openapi, '3.0.3')
  } catch (err) {
    t.assert.ifError(err)
  }
})

test('should generate swagger in yaml format', async (t) => {
  t.plan(1)

  try {
    const swagger = await generateSwagger(['--yaml=true', swaggerplugin])
    t.assert.ok(swagger.startsWith('openapi: 3.0.3'))
  } catch (err) {
    t.assert.ifError(err)
  }
})
