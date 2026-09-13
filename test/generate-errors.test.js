'use strict'

const { test } = require('node:test')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFile } = require('node:child_process')
const { promisify } = require('node:util')
const proxyquire = require('proxyquire')
const rimraf = require('rimraf')
const { javascriptTemplate } = require('../generate')

const pExecFile = promisify(execFile)
const generateCli = path.join(__dirname, '..', 'generate.js')

function makeTmpDir (t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fastify-cli-generate-'))
  t.after(() => rimraf.sync(dir))
  return dir
}

function silence (t) {
  t.mock.method(console, 'log', () => {})
}

test('generate should reject when the template cannot be copied', async (t) => {
  silence(t)
  const { generate } = proxyquire('../generate', {
    generify: (from, to, data, onFile, cb) => cb(new Error('copy failed'))
  })

  await t.assert.rejects(generate(makeTmpDir(t), javascriptTemplate), /copy failed/)
})

test('generate should reject when package.json cannot be read', async (t) => {
  silence(t)
  const { generate } = proxyquire('../generate', {
    'node:fs': {
      ...fs,
      readFile: (file, cb) => cb(new Error('read failed'))
    }
  })

  await t.assert.rejects(generate(makeTmpDir(t), javascriptTemplate), /read failed/)
})

test('generate should reject when package.json is not valid JSON', async (t) => {
  silence(t)
  const { generate } = proxyquire('../generate', {
    'node:fs': {
      ...fs,
      readFile: (file, cb) => cb(null, '{ not json')
    }
  })

  await t.assert.rejects(generate(makeTmpDir(t), javascriptTemplate), SyntaxError)
})

test('generate should reject when package.json cannot be written', async (t) => {
  silence(t)
  const { generate } = proxyquire('../generate', {
    'node:fs': {
      ...fs,
      writeFile: (file, data, cb) => cb(new Error('write failed'))
    }
  })

  await t.assert.rejects(generate(makeTmpDir(t), javascriptTemplate), /write failed/)
})

test('cli should exit with an error when generate fails', async (t) => {
  const dir = makeTmpDir(t)
  // an invalid package.json makes `npm init -y` fail inside generate()
  fs.writeFileSync(path.join(dir, 'package.json'), '{ not json')

  await t.assert.rejects(
    pExecFile(process.execPath, [generateCli, '.', '--integrate'], { cwd: dir }),
    err => {
      t.assert.strictEqual(err.code, 1)
      t.assert.match(err.stdout, /Command failed: npm init -y/)
      return true
    }
  )
})

test('cli should generate a typescript esm project', async (t) => {
  const dir = makeTmpDir(t)
  const target = path.join(dir, 'app')
  const { stdout } = await pExecFile(process.execPath, [generateCli, target, '--lang=ts', '--esm'], { cwd: dir })

  t.assert.match(stdout, /generated successfully/)
  const pkg = JSON.parse(fs.readFileSync(path.join(target, 'package.json'), 'utf8'))
  t.assert.strictEqual(pkg.type, 'module')
  t.assert.strictEqual(pkg.scripts.dev, 'fastify start -w -l info src/app.ts')
  t.assert.strictEqual(pkg.scripts['dev:start'], undefined)
  t.assert.ok(pkg.devDependencies.c8)
})
