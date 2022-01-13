// This file contains code that we reuse between our tests.
import * as tap from 'tap'
import { build } from 'fastify-cli/helper'

const AppPath = './src/app.ts'

export type Test = typeof tap['Test']['prototype'];

// Fill in this config with all the configurations
// needed for testing the application
async function config () {
  return {}
}

// Automatically build and tear down our instance
async function buildApplication (t: Test) {
  // you can set all the options supported by the fastify CLI command
  const argv = [AppPath]

  // fastify-plugin ensures that all decorators
  // are exposed for testing purposes, this is
  // different from the production setup
  const app = await build(argv, config())

  // Tear down our app after we are done
  t.teardown(() => void app.close())

  return app
}

export {
  config,
  buildApplication
}
