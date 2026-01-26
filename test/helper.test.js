'use strict'

const util = require('node:util')
const fs = require('node:fs')
const path = require('node:path')
const { test } = require('node:test')
const stream = require('node:stream')
const os = require('node:os')

const helper = require('../helper')

const writeFile = util.promisify(fs.writeFile)
const readFile = util.promisify(fs.readFile)

test('should return the fastify instance', async t => {
  const argv = ['./examples/plugin.js']
  const app = await helper.build(argv, {})
  t.after(() => app.close())
  t.assert.ok(!app.server.listening)
})

test('should reload the env at each build', async t => {
  const testdir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'fastify-cli-'))
  t.after(async () => {
    await fs.promises.rm(testdir, { recursive: true, force: true })
  })

  await writeFile(path.join(testdir, '.env'), 'GREETING=world')
  await writeFile(
    path.join(testdir, 'plugin.js'),
    await readFile(path.join(__dirname, '../examples/plugin-with-env.js'))
  )

  const argv = [path.join(testdir, 'plugin.js')]
  const cwd = process.cwd()

  process.chdir(testdir)
  t.after(() => { process.chdir(cwd) })

  {
    await writeFile(path.join(testdir, '.env'), 'GREETING=one')
    const app = await helper.build(argv)
    try {
      const res = await app.inject('/')
      t.assert.deepStrictEqual(res.json(), { hello: 'one' })
    } finally {
      await app.close()
    }
  }

  {
    delete process.env.GREETING // dotenv will not overwrite the env if set
    await writeFile(path.join(testdir, '.env'), 'GREETING=two')
    const app = await helper.build(argv)
    try {
      const res = await app.inject('/')
      t.assert.deepStrictEqual(res.json(), { hello: 'two' })
    } finally {
      await app.close()
    }
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
  try {
    const res = await app.inject('/')
    t.assert.deepStrictEqual(res.json(), {
      a: true,
      b: true,
      c: true,
      hello: 'world',
      from: 'build'
    })
  } finally {
    await app.close()
  }
})

test('setting plugin options, extra has priority', async t => {
  const argv = [
    './examples/plugin-with-custom-options.js',
    '--',
    '--hello',
    'world'
  ]
  const app = await helper.build(argv, { hello: 'planet' })
  try {
    const res = await app.inject('/')
    t.assert.deepStrictEqual(res.json(), {
      hello: 'planet'
    })
  } finally {
    await app.close()
  }
})

test('setting plugin options, extra has priority', async t => {
  const args = './examples/plugin-with-custom-options.js -- --hello world --from args'
  const app = await helper.build(args, { hello: 'planet' })
  try {
    const res = await app.inject('/')
    t.assert.deepStrictEqual(res.json(), {
      hello: 'planet',
      from: 'args'
    })
  } finally {
    await app.close()
  }
})

test('should start fastify', async t => {
  const argv = ['./examples/plugin.js']
  const app = await helper.listen(argv, {})
  t.after(() => app.close())
  t.assert.ok(app.server.listening)
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
  t.after(() => app.close())
  app.log.info('test')
  t.assert.strictEqual(lines.length, 0)
  app.log.warn('test')
  t.assert.strictEqual(lines.length, 1)
  t.assert.strictEqual(app.log.level, 'warn')
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
  t.after(() => app.close())
  app.log.info('test')
  t.assert.strictEqual(lines.length, 0)
  app.log.warn({ foo: 'test' })
  t.assert.strictEqual(app.log.level, 'warn')
  t.assert.strictEqual(lines.length, 1)
  t.assert.strictEqual(lines[0].foo, '***')
})

test('should ensure can access all decorators', async t => {
  const argv = ['./examples/plugin.js']
  const app = await helper.build(argv, { skipOverride: true })
  t.after(() => app.close())
  t.assert.ok(app.test)

  const app2 = await helper.listen(argv, { skipOverride: true })
  t.after(() => app2.close())
  t.assert.ok(app2.test)
})

test('should return the fastify instance when using serverModule', async t => {
  const argv = ['']
  const app = await helper.build(argv, { skipOverride: true }, {}, (app, opts, next) => {
    app.decorate('foo', 'bar')
    next()
  })
  t.after(() => app.close())
  t.assert.strictEqual(app.foo, 'bar')
})
