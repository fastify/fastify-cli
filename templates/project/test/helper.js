'use strict'

// This file contains code that we reuse
// between our tests.
const path = require('node:path')
const Fastify = require('fastify')

const AppPath = path.join(__dirname, '..', 'app.js')

// automatically build and tear down our instance
async function build (t) {
  // fastify options
  const options = {}

  const app = Fastify(options)
  const entry = require(AppPath)

  app.register(entry, entry.options)

  await app.ready()

  // close the app after we are done
  t.after(() => app.close())

  return app
}

module.exports = {
  build,
}
