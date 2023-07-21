// This file contains code that we reuse between our tests.
import helper from 'fastify-cli/helper.js'
import path from 'path'
import tap from 'tap';
import { fileURLToPath } from 'url'


export type Test = typeof tap['Test']['prototype'];

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const AppPath = path.join(__dirname, '..', 'src', 'app.ts')

// Fill in this config with all the configurations
// needed for testing the application
async function config () {
  return {}
}

// Automatically build and tear down our instance
async function build (t: Test) {
  // you can set all the options supported by the fastify CLI command
  const argv = [AppPath]

  // fastify-plugin ensures that all decorators
  // are exposed for testing purposes, this is
  // different from the production setup
  const app = await helper.build(argv, await config())

  // Tear down our app after we are done
  t.teardown(() => void app.close())

  return app
}

export {
  config,
  build
}
