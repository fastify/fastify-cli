import { fastify } from 'fastify'
import { test } from 'tap'
const sgetOriginal = require('simple-get').concat

import appDefault, { app } from '../../templates/app-ts/src/app'
import {AddressInfo} from "net";

const sget = (opts: Record<string, any>): Record<string, any> => {
    return new Promise((resolve, reject) => {
        sgetOriginal(opts, (err: Error, response: any, body: any) => {
            if (err) return reject(err)
            return resolve({ response, body })
        })
    })
}

test('should print routes for TS app', async t => {
    t.plan(4)

    const fastifyApp = fastify({}, );
    await app(fastifyApp, {});
    await fastifyApp.ready();
    await fastifyApp.listen({ port: 3000 })

    const { response, body } = await sget({
        method: 'GET',
        url: `http://localhost:${(fastifyApp.server.address() as AddressInfo).port}`
    })
    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], '' + body.length)
    t.same(JSON.parse(body), { root: true })

    await fastifyApp.close();
    t.pass('server closed')
})

test('should print routes for default TS app', async t => {
    t.plan(4)

    const fastifyApp = fastify({}, );
    await appDefault(fastifyApp, {});
    await fastifyApp.ready();
    await fastifyApp.listen({ port: 3000 })

    const { response, body } = await sget({
        method: 'GET',
        url: `http://localhost:${(fastifyApp.server.address() as AddressInfo).port}`
    })
    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], '' + body.length)
    t.same(JSON.parse(body), { root: true })

    await fastifyApp.close();
    t.pass('server closed')
})
