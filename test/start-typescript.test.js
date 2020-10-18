'use strict'

const util = require('util')
const { once } = require('events')
const fs = require('fs')
const crypto = require('crypto')
const { resolve, join } = require('path')
const baseFilename = `${__dirname}/fixtures/test_${crypto.randomBytes(16).toString('hex')}`
const root = join(__dirname, '..')
const t = require('tap')
const test = t.test
const { sgetOriginal } = require('./util')
const sget = util.promisify(sgetOriginal)
const start = require('../start')
const { ncp } = require('ncp')
const rimraf = require('rimraf')

test('should start the server with watch option', async (t) => {
  t.plan(5)

  const writeFile = util.promisify(fs.writeFile)
  const copyFile = util.promisify(fs.copyFile)
  const readFile = util.promisify(fs.readFile)
  const tmpts = baseFilename + '.ts'
  const example = resolve(__dirname, join(root, 'examples', 'plugin.ts'))

  await copyFile(example, tmpts)
  t.pass('plugin copied to fixture')

  const argv = ['-p', '5001', '-w', '--tsconfig', join(root, 'test', 'tsconfig', 'tsconfig.base.json'), tmpts]
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

test('should start the server with watch option in nested dir', async (t) => {
  t.plan(5)

  const writeFile = util.promisify(fs.writeFile)
  const readFile = util.promisify(fs.readFile)
  const copyDir = util.promisify(ncp)
  const removeDir = util.promisify(rimraf)
  const tmpDir = baseFilename
  const example = resolve(__dirname, join(root, 'examples', 'nested-ts'))

  await copyDir(example, tmpDir)
  t.pass('plugin copied to fixture')

  const argv = ['-p', '5002', '-w', join(tmpDir, 'src', 'plugin.ts')]
  process.chdir(join(tmpDir, 'child-project'))
  const fastifyEmitter = await start.start(argv)

  await once(fastifyEmitter, 'ready')
  t.pass('should receive ready event')

  t.tearDown(async () => {
    if (fs.existsSync(tmpDir)) {
      await removeDir(tmpDir)
    }
    fastifyEmitter.emit('close')
  })

  const data = await readFile(join(tmpDir, 'child-project', 'src', 'plugin.ts'))

  await writeFile(join(tmpDir, 'child-project', 'src', 'plugin.ts'), data.toString().replace(/(world)/ig, 'fastify'))
  t.pass('change tmpts')

  await once(fastifyEmitter, 'ready')
  t.pass('should receive ready after restart')

  const { body } = await sget({
    method: 'GET',
    url: 'http://localhost:5002'
  })
  t.deepEqual(JSON.parse(body), { hello: 'fastify' })
})
