import fastify from 'fastify'
import example from '..'
import { expectType } from 'tsd'

let app
try {
  app = fastify()
  // eslint-disable-next-line no-void
  void app.ready()
  // eslint-disable-next-line no-void
  void app.register(example)
  expectType<() => string>(app.exampleDecorator)
} catch (err) {
  console.error(err)
}
