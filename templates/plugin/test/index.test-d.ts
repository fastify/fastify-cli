import fastify from 'fastify'
import example from '..'
import { expectType } from 'tsd'

const app = fastify()

app.register(example)

expectType<() => string>(app.exampleDecorator)
