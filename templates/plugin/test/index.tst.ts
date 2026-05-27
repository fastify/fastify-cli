import fastify from 'fastify'
import example from '..'
import { expect } from 'tstyche'

let app
try {
  app = fastify()
  // eslint-disable-next-line no-void
  void app.ready()
  // eslint-disable-next-line no-void
  void app.register(example)
  expect(app.exampleDecorator).type.toBe<() => string>()
} catch (err) {
  console.error(err)
}
