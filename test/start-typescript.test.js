'use strict'

const util = require('util')
const { once } = require('events')
const fs = require('fs')
const crypto = require('crypto')
const baseFilename = `${__dirname}/fixtures/test_${crypto.randomBytes(16).toString('hex')}`

const t = require('tap')
const test = t.test
const sgetOriginal = require('simple-get').concat
const sget = (opts, cb) => {
  return new Promise((resolve, reject) => {
    sgetOriginal(opts, (err, response, body) => {
      if (err) return reject(err)
      return resolve({ response, body })
    })
  })
}
const start = require('../start')

// FIXME
// paths are relative to the root of the project
// this can be run only from there

test('should start the server with watch options and refresh app instance on directory change', async (t) => {
  t.plan(5)

  const writeFile = util.promisify(fs.writeFile)
  const copyFile = util.promisify(fs.copyFile)
  const readFile = util.promisify(fs.readFile)
  const tmpts = baseFilename + '.ts'

  await copyFile('examples/plugin.ts', tmpts)
  t.pass('plugin copied to fixture')

  const argv = ['-p', '5001', '-w', '--tsconfig', 'tsconfig.tswatch.json', tmpts]
  const fastifyEmitter = await start.start(argv)

  await once(fastifyEmitter, 'ready')
  t.pass('should receive ready event')

  t.tearDown(() => {
    if (fs.existsSync(tmpts)) {
      fs.unlinkSync(tmpts)
    }
    fastifyEmitter.emit('close')
  })

  const data = await readFile(tmpts)

  await writeFile(tmpts, data.toString().replace(/(world)/ig, 'fastify'))
  t.pass('change tmpts')

  await once(fastifyEmitter, 'ready')
  t.pass('should receive ready after restart')

  const { body } = await sget({
    method: 'GET',
    url: 'http://localhost:5001'
  })
  t.deepEqual(JSON.parse(body), { hello: 'fastify' })
})
