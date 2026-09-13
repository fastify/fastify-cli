'use strict'

const { test } = require('node:test')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFile } = require('node:child_process')
const { promisify } = require('node:util')
const rimraf = require('rimraf')
const { generate, pluginTemplate } = require('../generate-plugin')

const pExecFile = promisify(execFile)
const generatePluginCli = path.join(__dirname, '..', 'generate-plugin.js')

function makeTmpDir (t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fastify-cli-plugin-'))
  t.after(() => rimraf.sync(dir))
  return dir
}

test('generate should merge tstyche settings and preexisting package.json fields', async (t) => {
  t.mock.method(console, 'log', () => {})
  const dir = makeTmpDir(t)
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
    name: 'my-plugin',
    scripts: { custom: 'echo custom' },
    dependencies: { 'left-pad': '1.0.0' },
    devDependencies: { 'right-pad': '1.0.0' },
    tstyche: { target: ['5.0'] }
  }))

  await generate(dir, {
    ...pluginTemplate,
    tstyche: { testFileMatch: ['**/*.tst.ts'] }
  })

  const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
  t.assert.strictEqual(pkg.scripts.custom, 'echo custom')
  t.assert.strictEqual(pkg.dependencies['left-pad'], '1.0.0')
  t.assert.strictEqual(pkg.devDependencies['right-pad'], '1.0.0')
  t.assert.deepStrictEqual(pkg.tstyche, { target: ['5.0'], testFileMatch: ['**/*.tst.ts'] })
})

test('cli should exit with an error when generate fails', async (t) => {
  const dir = makeTmpDir(t)
  // an invalid package.json makes `npm init -y` fail inside generate()
  fs.writeFileSync(path.join(dir, 'package.json'), '{ not json')

  await t.assert.rejects(
    pExecFile(process.execPath, [generatePluginCli, '.', '--integrate'], { cwd: dir }),
    err => {
      t.assert.strictEqual(err.code, 1)
      t.assert.match(err.stdout, /Command failed: npm init -y/)
      return true
    }
  )
})
