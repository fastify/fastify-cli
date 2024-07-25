'use strict'

const util = require('node:util')
const fs = require('node:fs')
const path = require('node:path')
const { test } = require('tap')
const stream = require('node:stream')

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

test('should start fastify with custom logger configuration', async t => {
  const argv = ['./examples/plugin.js']
  const lines = []
  const dest = new stream.Writable({
    write: function (chunk, enc, cb) {
      lines.push(JSON.parse(chunk))
      cb()
    }
  })

  const app = await helper.listen(argv, {}, {
    logger: {
      level: 'warn',
      stream: dest
    }
  })
  t.teardown(() => app.close())
  app.log.info('test')
  t.same(lines.length, 0)
  app.log.warn('test')
  t.same(lines.length, 1)
  t.same(app.log.level, 'warn')
})

test('should merge the CLI and FILE configs', async t => {
  const argv = ['./examples/plugin-with-logger.js', '--options']

  const lines = []
  const dest = new stream.Writable({
    write: function (chunk, enc, cb) {
      lines.push(JSON.parse(chunk))
      cb()
    }
  })

  const app = await helper.listen(argv, {}, {
    logger: {
      level: 'warn',
      stream: dest
    }
  })
  t.teardown(() => app.close())
  app.log.info('test')
  t.same(lines.length, 0)
  app.log.warn({ foo: 'test' })
  t.same(app.log.level, 'warn')
  t.same(lines.length, 1)
  t.same(lines[0].foo, '***')
})

test('should ensure can access all decorators', async t => {
  const argv = ['./examples/plugin.js']
  const app = await helper.build(argv, { skipOverride: true })
  t.teardown(() => app.close())
  t.ok(app.test)

  const app2 = await helper.listen(argv, { skipOverride: true })
  t.teardown(() => app2.close())
  t.ok(app2.test)
})
