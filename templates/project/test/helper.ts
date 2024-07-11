// This file contains code that we reuse between our tests.
import Fastify from 'fastify'
import type * as test from 'node:test'
import * as path from 'path'

export type TestContext = {
  after: typeof test.after
}

const AppPath = path.join(__dirname, '..', 'src', 'app.ts')

// Automatically build and tear down our instance
async function build (t: TestContext) {
  // fastify options
  const options = {}

  const app = Fastify(options)
  const entry = await import(AppPath)

  app.register(entry, entry.options)

  await app.ready()

  // Tear down our app after we are done
  t.after(() => app.close())

  return app
}

export {
  build,
}
