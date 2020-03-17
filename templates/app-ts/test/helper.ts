// This file contains code that we reuse
// between our tests.
import Fastify from 'fastify'
import fp from 'fastify-plugin'
import App from '../app'
import { Test } from 'tap'

// Fill in this config with all the configurations
// needed for testing the application
function config () {
  return {}
}

// automatically build and tear down our instance
function build (t: Test) {
  const app = Fastify()

  // fastify-plugin ensures that all decorators
  // are exposed for testing purposes, this is
  // different from the production setup
  app.register(fp(App), config())

  // tear down our app after we are done
  t.tearDown(app.close.bind(app))

  return app
}

export {
  config,
  build
}
