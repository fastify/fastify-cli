const path = require('path')
const t = require('tap')
const { test } = t
const { generateSwagger } = require('../generate-swagger')

const swaggerplugindir = path.join(__dirname, 'swaggerplugindir')
const swaggerplugin = path.join(swaggerplugindir, 'plugin.js')

test('should generate swagger', async (t) => {
  t.plan(1)

  try {
    const swagger = JSON.parse(await generateSwagger([swaggerplugin]))
    t.equal(swagger.openapi, '3.0.3')
  } catch (err) {
    t.error(err)
  }
})
