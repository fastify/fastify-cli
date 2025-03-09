import { fastify } from 'fastify'
import { test, TestContext } from 'node:test'

import { AddressInfo } from 'node:net'
import appDefault, { app } from '../../templates/app-ts/src/app'
const sgetOriginal = require('simple-get').concat

const sget = (opts: Record<string, any>): Record<string, any> => {
  return new Promise((resolve, reject) => {
    sgetOriginal(opts, (err: Error, response: any, body: any) => {
      if (err) return reject(err)
      return resolve({ response, body })
    })
  })
}

test('should print routes for TS app', async (t: TestContext) => {
  t.plan(4)

  const fastifyApp = fastify({})
  await app(fastifyApp, {})
  await fastifyApp.ready()
  await fastifyApp.listen({ port: 3000 })

  const { response, body } = await sget({
    method: 'GET',
    url: `http://localhost:${(fastifyApp.server.address() as AddressInfo).port}`
  })
  t.assert.equal(response.statusCode, 200)
  t.assert.equal(response.headers['content-length'], '' + body.length)
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

  const { response, body } = await sget({
    method: 'GET',
    url: `http://localhost:${(fastifyApp.server.address() as AddressInfo).port}`
  })
  t.assert.equal(response.statusCode, 200)
  t.assert.equal(response.headers['content-length'], '' + body.length)
  t.assert.deepStrictEqual(JSON.parse(body), { root: true })

  await fastifyApp.close()
  t.assert.ok('server closed')
})
