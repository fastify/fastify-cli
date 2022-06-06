import Fastify from 'fastify'
import { expectType } from 'tsd'
import plugin from '..'

const fastify = Fastify()
void fastify.register(plugin)

expectType<() => string>(fastify.exampleDecorator)
