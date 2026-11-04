import Fastify from 'fastify'
import fp from 'fastify-plugin'
import type { TestContext as NodeTestContext } from 'node:test'
import App from '../src/app.js'

export type TestContext = Pick<NodeTestContext, 'after'>

// Fill in this config with the options needed for testing the application.
function config () {
  return { skipOverride: true }
}

// Build an application without starting a server, and close it after the test.
async function build (t: TestContext) {
  const { skipOverride, ...options } = config()
  const app = Fastify()
  t.after(async () => { await app.close() })
  app.register(skipOverride ? fp(App) : App, options)
  await app.ready()
  return app
}

export { config, build }
