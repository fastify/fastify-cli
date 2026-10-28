import Fastify from 'fastify'
import fp from 'fastify-plugin'
import App from '../app.js'

// Fill in this config with the options needed for testing the application.
function config () {
  return { skipOverride: true }
}

// Build an application without starting a server, and close it after the test.
async function build (t) {
  const { skipOverride, ...options } = config()
  const app = Fastify()
  t.after(() => app.close())
  app.register(skipOverride ? fp(App) : App, options)
  await app.ready()
  return app
}

export { config, build }
