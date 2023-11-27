// This file contains code that we reuse between our tests.
const helper = require('fastify-cli/helper.js')
import * as path from 'path'

export type TeardownFn = (after: () => void) => void;

const AppPath = path.join(__dirname, '..', 'src', 'app.ts')

// Fill in this config with all the configurations
// needed for testing the application
async function config () {
  return {}
}

// Automatically build and tear down our instance
async function build (teardown: TeardownFn) {
  // you can set all the options supported by the fastify CLI command
  const argv = [AppPath]

  // fastify-plugin ensures that all decorators
  // are exposed for testing purposes, this is
  // different from the production setup
  const app = await helper.build(argv, await config())

  // Tear down our app after we are done
  teardown(() => void app.close())

  return app
}

export {
  config,
  build
}
