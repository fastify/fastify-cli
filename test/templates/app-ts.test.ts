import { fastify } from 'fastify'
import { test, TestContext } from 'node:test'

import { AddressInfo } from 'node:net'
import appDefault, { app } from '../../templates/app-ts/src/app'

test('should print routes for TS app', async (t: TestContext) => {
  t.plan(4)

  const fastifyApp = fastify({})
  await app(fastifyApp, {})
  await fastifyApp.ready()
  await fastifyApp.listen({ port: 3000 })

  const result = await fetch(`http://localhost:${(fastifyApp.server.address() as AddressInfo).port}`)
  t.assert.equal(result.status, 200)

  const body = await result.text()
  t.assert.equal(result.headers.get('content-length'), '' + body.length)
  t.assert.deepStrictEqual(JSON.parse(body), { root: true })

  await fastifyApp.close()
  t.assert.ok('server closed')
})

test('should print routes for default TS app', async (t: TestContext) => {
  t.plan(4)

  const fastifyApp = fastify({})
  await appDefault(fastifyApp, {})
  await fastifyApp.ready()
  await fastifyApp.listen({ port: 3000 })

  const result = await fetch(`http://localhost:${(fastifyApp.server.address() as AddressInfo).port}`)
  t.assert.equal(result.status, 200)

  const body = await result.text()
  t.assert.equal(result.headers.get('content-length'), '' + body.length)
  t.assert.deepStrictEqual(JSON.parse(body), { root: true })

  await fastifyApp.close()
  t.assert.ok('server closed')
})
