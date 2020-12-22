import { fastify } from 'fastify'
import { test } from 'tap'
const sgetOriginal = require('simple-get').concat

import appDefault, { app } from '../../templates/app-ts/src/app'

const PORT = 3001;
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
    await fastifyApp.listen(PORT)

    const { response, body } = await sget({
        method: 'GET',
        url: `http://localhost:${PORT}`
    })
    t.strictEqual(response.statusCode, 200)
    t.strictEqual(response.headers['content-length'], '' + body.length)
    t.deepEqual(JSON.parse(body), { root: true })

    await fastifyApp.close();
    t.pass('server closed')
})

test('should print routes for default TS app', async t => {
    t.plan(4)

    const fastifyApp = fastify({}, );
    await appDefault(fastifyApp, {});
    await fastifyApp.ready();
    await fastifyApp.listen(PORT)

    const { response, body } = await sget({
        method: 'GET',
        url: `http://localhost:${PORT}`
    })
    t.strictEqual(response.statusCode, 200)
    t.strictEqual(response.headers['content-length'], '' + body.length)
    t.deepEqual(JSON.parse(body), { root: true })

    await fastifyApp.close();
    t.pass('server closed')
})
