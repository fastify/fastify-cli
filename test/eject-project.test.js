'use strict'

const { test } = require('node:test')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { execFile, spawn } = require('node:child_process')
const { promisify } = require('node:util')
const proxyquire = require('proxyquire')
const { eject } = require('../eject')
const cliPkg = require('../package.json')
const { javascriptTemplate } = require('../generate')

const exec = promisify(execFile)
const root = path.join(__dirname, '..')
const cliPath = path.join(root, 'cli.js')

async function makeDir (t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'fastify-eject-project-'))
  t.after(() => fs.rm(dir, { recursive: true, force: true }))
  return dir
}

async function writePackage (dir, pkg) {
  await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n')
}

// Expose only the declared dependencies, so importing fastify-cli fails.
async function linkDependencies (dir, pkg) {
  const modules = path.join(dir, 'node_modules')
  await fs.mkdir(path.join(modules, '.bin'), { recursive: true })
  for (const name of new Set([...Object.keys(pkg.dependencies), ...Object.keys(pkg.devDependencies || {})])) {
    if (name === 'fastify-cli') throw new Error('ejected project still depends on fastify-cli')
    const target = path.join(modules, name)
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.symlink(path.join(root, 'node_modules', name), target, 'junction')
  }
  for (const bin of ['tsc', 'c8', 'concurrently']) {
    for (const suffix of ['', '.cmd', '.ps1']) {
      const source = path.join(root, 'node_modules', '.bin', bin + suffix)
      try {
        await fs.cp(source, path.join(modules, '.bin', bin + suffix))
      } catch (err) {
        if (err.code !== 'ENOENT') throw err
      }
    }
  }
}

async function requestServer (t, dir, args) {
  const child = spawn(process.execPath, args, { cwd: dir, env: { ...process.env, PORT: '0' } })
  t.after(() => child.kill())
  const closed = new Promise(resolve => child.once('close', resolve))
  let output = ''
  const address = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`server did not listen: ${output}`)), 15000)
    const finish = (err, url) => {
      clearTimeout(timeout)
      if (err) reject(err)
      else resolve(url)
    }
    child.once('error', err => finish(err))
    child.once('exit', code => finish(new Error(`server exited ${code}: ${output}`)))
    child.stderr.on('data', data => { output += data })
    child.stdout.on('data', data => {
      output += data
      const match = output.match(/http:\/\/(?:127\.0\.0\.1|\[::1\]):\d+/)
      if (match) finish(null, match[0])
    })
  })
  const response = await fetch(`${address}/example`)
  t.assert.strictEqual(response.status, 200)
  t.assert.strictEqual(await response.text(), 'this is an example')
  child.kill('SIGTERM')
  await closed
  if (process.platform !== 'win32') t.assert.strictEqual(child.exitCode, 0)
}

for (const typescript of [false, true]) {
  for (const esm of [false, true]) {
    test(`generated ${typescript ? 'TypeScript' : 'JavaScript'} ${esm ? 'ESM' : 'CJS'} app runs without fastify-cli after eject`, async t => {
      const parent = await makeDir(t)
      const dir = path.join(parent, 'app')
      const flags = [...(typescript ? ['--lang=ts'] : []), ...(esm ? ['--esm'] : [])]
      await exec(process.execPath, [cliPath, 'generate', 'app', ...flags], { cwd: parent })
      await exec(process.execPath, [cliPath, 'eject'], { cwd: dir })
      const manifest = await fs.readFile(path.join(dir, 'package.json'), 'utf8')
      const pkg = JSON.parse(manifest)
      t.assert.strictEqual(pkg.dependencies['fastify-cli'], undefined)
      t.assert.strictEqual(pkg.dependencies['close-with-grace'], cliPkg.dependencies['close-with-grace'])
      t.assert.ok(!Object.values(pkg.scripts).some(script => /\bfastify\b/.test(script)))
      t.assert.strictEqual(pkg.scripts.start, typescript ? 'npm run build:ts && node dist/server.js' : 'node server.js')
      await linkDependencies(dir, pkg)
      await t.assert.rejects(exec(process.execPath, ['-e', "require.resolve('fastify-cli/helper')"], { cwd: dir }), /MODULE_NOT_FOUND/)
      // The app's c8 command must not clean the parent suite's coverage directory.
      await exec('npm', ['test'], { cwd: dir, env: { ...process.env, NODE_V8_COVERAGE: path.join(dir, 'coverage', 'tmp') }, timeout: 60000, maxBuffer: 1024 * 1024, shell: process.platform === 'win32' })
      await requestServer(t, dir, [typescript ? 'dist/server.js' : 'server.js'])
      await exec(process.execPath, [cliPath, 'eject'], { cwd: dir })
      t.assert.strictEqual(await fs.readFile(path.join(dir, 'package.json'), 'utf8'), manifest)
    })
  }
}

test('preserves custom scripts and dependencies while updating generated commands', async t => {
  const dir = await makeDir(t)
  const pkg = {
    name: 'custom-app',
    scripts: { ...javascriptTemplate.scripts, dev: 'fastify start -w -p 4000 app.js', lint: 'eslint', custom: 'echo hello' },
    dependencies: { 'fastify-cli': '^8.0.0', 'close-with-grace': '^2.0.0', custom: '1.0.0' },
    devDependencies: { 'fastify-cli': '^8.0.0' }
  }
  await writePackage(dir, pkg)
  await eject(dir, 'eject')
  const result = JSON.parse(await fs.readFile(path.join(dir, 'package.json'), 'utf8'))
  t.assert.strictEqual(result.scripts.start, 'node server.js')
  t.assert.strictEqual(result.scripts.dev, pkg.scripts.dev)
  t.assert.strictEqual(result.scripts.lint, 'eslint')
  t.assert.strictEqual(result.scripts.custom, 'echo hello')
  t.assert.deepStrictEqual(result.dependencies, pkg.dependencies)
  t.assert.deepStrictEqual(result.devDependencies, pkg.devDependencies)
})

test('preserves customized test helpers and keeps the CLI they import', async t => {
  const dir = await makeDir(t)
  await writePackage(dir, { scripts: javascriptTemplate.scripts, dependencies: { 'fastify-cli': '^8.0.0' } })
  await fs.mkdir(path.join(dir, 'test'))
  const helper = "const helper = require('fastify-cli/helper')\n// custom configuration\n"
  await fs.writeFile(path.join(dir, 'test', 'helper.js'), helper)
  await eject(dir, 'eject')
  t.assert.strictEqual(await fs.readFile(path.join(dir, 'test', 'helper.js'), 'utf8'), helper)
  const pkg = JSON.parse(await fs.readFile(path.join(dir, 'package.json'), 'utf8'))
  t.assert.strictEqual(pkg.dependencies['fastify-cli'], '^8.0.0')
})

test('does not overwrite custom servers or modify their manifest', async t => {
  const dir = await makeDir(t)
  await writePackage(dir, { dependencies: { 'fastify-cli': '^8.0.0' } })
  const manifest = await fs.readFile(path.join(dir, 'package.json'), 'utf8')
  await fs.writeFile(path.join(dir, 'server.js'), '// custom server\n')
  await t.assert.rejects(eject(dir, 'eject'), /server.js already exists/)
  t.assert.strictEqual(await fs.readFile(path.join(dir, 'server.js'), 'utf8'), '// custom server\n')
  t.assert.strictEqual(await fs.readFile(path.join(dir, 'package.json'), 'utf8'), manifest)
})

test('rejects invalid manifests before writing a server', async t => {
  const dir = await makeDir(t)
  await fs.writeFile(path.join(dir, 'package.json'), '{')
  await t.assert.rejects(eject(dir, 'eject'), SyntaxError)
  await t.assert.rejects(fs.access(path.join(dir, 'server.js')), { code: 'ENOENT' })
})

test('explicit module and language flags override detection', async t => {
  const dir = await makeDir(t)
  await writePackage(dir, { type: 'module' })
  await fs.mkdir(path.join(dir, 'src'))
  await fs.writeFile(path.join(dir, 'src', 'app.ts'), '')
  await exec(process.execPath, [cliPath, 'eject', '--esm=false', '--lang=js'], { cwd: dir })
  const server = await fs.readFile(path.join(dir, 'server.js'), 'utf8')
  t.assert.match(server, /require\('fastify'\)/)
  await t.assert.rejects(fs.access(path.join(dir, 'src', 'server.ts')), { code: 'ENOENT' })
})

test('keeps custom TypeScript configs and reports unreadable configs without rewriting the manifest', async t => {
  for (const configPath of ['tsconfig.json', path.join('test', 'tsconfig.json')]) {
    const dir = await makeDir(t)
    await writePackage(dir, { scripts: { start: 'custom-start' } })
    const manifest = await fs.readFile(path.join(dir, 'package.json'), 'utf8')
    await fs.mkdir(path.join(dir, configPath), { recursive: true })
    await t.assert.rejects(eject(dir, 'eject-ts'), { code: 'EISDIR' })
    t.assert.strictEqual(await fs.readFile(path.join(dir, 'package.json'), 'utf8'), manifest)
  }
  const dir = await makeDir(t)
  await writePackage(dir, { scripts: { start: 'custom-start' } })
  const config = '{"compilerOptions":{"rootDir":"src","strict":false}}\n'
  await fs.writeFile(path.join(dir, 'tsconfig.json'), config)
  await eject(dir, 'eject-ts')
  t.assert.strictEqual(await fs.readFile(path.join(dir, 'tsconfig.json'), 'utf8'), config)
  await t.assert.rejects(fs.access(path.join(dir, 'test', 'tsconfig.json')), { code: 'ENOENT' })
})

test('rejects unreadable helpers before generating a server', async t => {
  const dir = await makeDir(t)
  await writePackage(dir, {})
  await fs.mkdir(path.join(dir, 'test', 'helper.js'), { recursive: true })
  await t.assert.rejects(eject(dir, 'eject'), { code: 'EISDIR' })
  await t.assert.rejects(fs.access(path.join(dir, 'server.js')), { code: 'ENOENT' })
})

test('reports language detection errors without generating a server', async t => {
  const dir = await makeDir(t)
  const { cli } = proxyquire('../eject', {
    'node:fs/promises': {
      access: async () => { throw new Error('cannot inspect app.ts') }
    }
  })
  t.mock.method(process, 'cwd', () => dir)
  t.mock.method(process, 'exit', () => {})
  const log = t.mock.method(console, 'log', () => {})
  await cli([])
  t.assert.strictEqual(process.exit.mock.calls[0].arguments[0], 1)
  t.assert.match(log.mock.calls[0].arguments[0], /cannot inspect app.ts/)
  await t.assert.rejects(fs.access(path.join(dir, 'server.js')), { code: 'ENOENT' })
})
