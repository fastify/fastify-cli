'use strict'

const util = require('util')
const fs = require('fs')
const path = require('path')
const { test } = require('tap')

const helper = require('../helper')

const writeFile = util.promisify(fs.writeFile)
const readFile = util.promisify(fs.readFile)

test('should return the fastify instance', async t => {
  const argv = ['./examples/plugin.js']
  const app = await helper.build(argv, {})
  t.teardown(() => app.close())
  t.notOk(app.server.listening)
})

test('should reload the env at each build', async t => {
  const testdir = t.testdir({
    '.env': 'GREETING=world',
    'plugin.js': await readFile(path.join(__dirname, '../examples/plugin-with-env.js'))
  })

  const argv = [path.join(testdir, 'plugin.js')]
  const cwd = process.cwd()

  process.chdir(testdir)
  t.teardown(() => { process.chdir(cwd) })

  {
    await writeFile(path.join(testdir, '.env'), 'GREETING=one')
    const app = await helper.build(argv)
    t.teardown(() => app.close())
    const res = await app.inject('/')
    t.same(res.json(), { hello: 'one' })
  }

  {
    delete process.env.GREETING // dotenv will not overwrite the env if set
    await writeFile(path.join(testdir, '.env'), 'GREETING=two')
    const app = await helper.build(argv)
    t.teardown(() => app.close())
    const res = await app.inject('/')
    t.same(res.json(), { hello: 'two' })
  }
})

test('setting plugin options', async t => {
  const argv = [
    './examples/plugin-with-custom-options.js',
    '--',
    '-abc',
    '--hello',
    'world'
  ]
  const app = await helper.build(argv, { from: 'build' })
  t.teardown(() => app.close())
  const res = await app.inject('/')
  t.same(res.json(), {
    a: true,
    b: true,
    c: true,
    hello: 'world',
    from: 'build'
  })
})

test('setting plugin options, extra has priority', async t => {
  const argv = [
    './examples/plugin-with-custom-options.js',
    '--',
    '--hello',
    'world'
  ]
  const app = await helper.build(argv, { hello: 'planet' })
  t.teardown(() => app.close())
  const res = await app.inject('/')
  t.same(res.json(), {
    hello: 'planet'
  })
})

test('setting plugin options, extra has priority', async t => {
  const args = './examples/plugin-with-custom-options.js -- --hello world --from args'
  const app = await helper.build(args, { hello: 'planet' })
  t.teardown(() => app.close())
  const res = await app.inject('/')
  t.same(res.json(), {
    hello: 'planet',
    from: 'args'
  })
})

test('should start fastify', async t => {
  const argv = ['./examples/plugin.js']
  const app = await helper.listen(argv, {})
  t.teardown(() => app.close())
  t.ok(app.server.listening)
})
