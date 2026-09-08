'use strict'

const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')
const { test } = require('node:test')
const { execFile } = require('node:child_process')
const { promisify } = require('node:util')
const rimraf = require('rimraf')
const { generate } = require('../generate-readme')

const pExecFile = promisify(execFile)
const plugindir = path.join(__dirname, 'plugindir')
const plugin = require(plugindir)
const readmeCli = path.join(__dirname, '..', 'generate-readme.js')

function makeTmpDir (t, prefix = 'fastify-cli-readme-') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  t.after(() => rimraf.sync(dir))
  return dir
}

function runCli (args, cwd) {
  return pExecFile(process.execPath, [readmeCli, ...args], { cwd })
    .then(res => ({ code: 0, ...res }))
    .catch(err => ({ code: err.code, stdout: err.stdout, stderr: err.stderr }))
}

test('should create readme', async (t) => {
  t.plan(1)
  const pluginMeta = plugin[Symbol.for('plugin-meta')]
  const encapsulated = !plugin[Symbol.for('skip-override')]
  const pluginFileName = path.basename(plugindir)
  try {
    await generate(plugindir, { pluginMeta, encapsulated, pluginFileName })
    const readme = path.join(plugindir, 'README.md')
    t.assert.ok(fs.existsSync(readme))
    rimraf.sync(readme)
  } catch (err) {
    t.assert.ifError(err)
  }
})

test('should run npm init and fill in decorators, dependencies and fastify version when missing', async (t) => {
  const dir = makeTmpDir(t)
  fs.copyFileSync(path.join(plugindir, 'plugin.js'), path.join(dir, 'plugin.js'))

  const pluginMeta = {
    decorators: { fastify: ['someSupport'], reply: ['view'] },
    dependencies: ['@fastify/sensible']
  }
  await generate(dir, { pluginMeta, encapsulated: true, pluginFileName: 'plugin.js' })

  t.assert.ok(fs.existsSync(path.join(dir, 'package.json')), 'package.json was generated')
  const readme = fs.readFileSync(path.join(dir, 'README.md'), 'utf8')
  t.assert.match(readme, /- someSupport/)
  t.assert.match(readme, /- view/)
  t.assert.match(readme, /- @fastify\/sensible/)
  t.assert.match(readme, /\[X\] Accessible only in a child context/)
})

test('should use the peerDependencies fastify version', async (t) => {
  const dir = makeTmpDir(t)
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
    name: 'peer-plugin',
    peerDependencies: { fastify: '^5.0.0' }
  }))

  await generate(dir, { pluginMeta: {}, encapsulated: false, pluginFileName: 'plugin.js' })

  const readme = fs.readFileSync(path.join(dir, 'README.md'), 'utf8')
  t.assert.match(readme, /\^5\.0\.0/)
  t.assert.match(readme, /\[X\] Accessible in the same context/)
})

test('should reject on an invalid package.json', async (t) => {
  const dir = makeTmpDir(t)
  fs.writeFileSync(path.join(dir, 'package.json'), '{ not json')

  await t.assert.rejects(
    generate(dir, { pluginMeta: {}, encapsulated: false, pluginFileName: 'plugin.js' }),
    SyntaxError
  )
})

test('cli should print the help when the file parameter is missing', async (t) => {
  const dir = makeTmpDir(t)
  const res = await runCli([], dir)

  t.assert.strictEqual(res.code, 0)
  t.assert.match(res.stdout, /Usage: fastify readme/)
})

test('cli should print the help with --help', async (t) => {
  const dir = makeTmpDir(t)
  const res = await runCli(['--help'], dir)

  t.assert.strictEqual(res.code, 0)
  t.assert.match(res.stdout, /Usage: fastify readme/)
})

test('cli should fail when README.md already exists', async (t) => {
  const dir = makeTmpDir(t)
  fs.writeFileSync(path.join(dir, 'README.md'), '# hello')
  const res = await runCli(['plugin.js'], dir)

  t.assert.strictEqual(res.code, 1)
  t.assert.match(res.stdout, /README\.md file already exists/)
})

test('cli should fail when the plugin cannot be loaded', async (t) => {
  const dir = makeTmpDir(t)
  const res = await runCli(['missing.js'], dir)

  t.assert.strictEqual(res.code, 1)
  t.assert.match(res.stdout, /plugin could not be loaded/)
})

test('cli should fail when the plugin has no metadata', async (t) => {
  const dir = makeTmpDir(t)
  fs.writeFileSync(path.join(dir, 'plugin.js'), 'module.exports = function (fastify, opts, next) { next() }')
  const res = await runCli(['plugin.js'], dir)

  t.assert.strictEqual(res.code, 1)
  t.assert.match(res.stdout, /no plugin metadata could be found/)
})

test('cli should generate the README', async (t) => {
  const dir = makeTmpDir(t)
  fs.copyFileSync(path.join(plugindir, 'plugin.js'), path.join(dir, 'plugin.js'))
  fs.copyFileSync(path.join(plugindir, 'package.json'), path.join(dir, 'package.json'))
  fs.symlinkSync(path.join(__dirname, '..', 'node_modules'), path.join(dir, 'node_modules'), 'dir')
  const res = await runCli(['plugin.js'], dir)

  t.assert.strictEqual(res.code, 0)
  t.assert.match(res.stdout, /README for plugin plugindir generated successfully/)
  t.assert.ok(fs.existsSync(path.join(dir, 'README.md')))
})

test('cli should report errors from generate', async (t) => {
  const dir = makeTmpDir(t)
  // a .cjs plugin without dependencies can be loaded even if package.json is broken
  fs.writeFileSync(path.join(dir, 'plugin.cjs'), [
    'const plugin = function (fastify, opts, next) { next() }',
    "plugin[Symbol.for('plugin-meta')] = {}",
    'module.exports = plugin'
  ].join('\n'))
  fs.writeFileSync(path.join(dir, 'package.json'), '{ not json')
  const res = await runCli(['plugin.cjs'], dir)

  t.assert.strictEqual(res.code, 1)
  t.assert.match(res.stdout, /JSON/)
})

test('should reject when the template cannot be copied', async (t) => {
  const proxyquire = require('proxyquire')
  const readme = proxyquire('../generate-readme', {
    generify: (from, to, data, onFile, cb) => cb(new Error('copy failed'))
  })
  const dir = makeTmpDir(t)
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'x' }))

  await t.assert.rejects(
    readme.generate(dir, { pluginMeta: {}, encapsulated: false, pluginFileName: 'plugin.js' }),
    /copy failed/
  )
})
