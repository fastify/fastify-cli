'use strict'

const { test } = require('node:test')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFile } = require('node:child_process')
const { promisify } = require('node:util')
const proxyquire = require('proxyquire')
const rimraf = require('rimraf')

const pExecFile = promisify(execFile)
const ejectCli = path.join(__dirname, '..', 'eject.js')

function makeTmpDir (t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fastify-cli-eject-'))
  t.after(() => rimraf.sync(dir))
  return dir
}

test('eject should reject when the template cannot be copied', async (t) => {
  const { eject } = proxyquire('../eject', {
    generify: (from, to, data, onFile, cb) => cb(new Error('copy failed'))
  })

  await t.assert.rejects(eject(makeTmpDir(t), 'eject'), /copy failed/)
})

test('cli should log the error and exit when eject fails', async (t) => {
  const { cli } = proxyquire('../eject', {
    generify: (from, to, data, onFile, cb) => cb(new Error('copy failed'))
  })
  t.mock.method(process, 'exit', () => {})
  const log = t.mock.method(console, 'log', () => {})

  await cli([])

  t.assert.strictEqual(process.exit.mock.calls[0].arguments[0], 1)
  t.assert.match(log.mock.calls.map(c => c.arguments.join(' ')).join('\n'), /copy failed/)
})

test('should eject the esm template when run directly', async (t) => {
  const dir = makeTmpDir(t)
  await pExecFile(process.execPath, [ejectCli, '--esm'], { cwd: dir })

  t.assert.ok(fs.existsSync(path.join(dir, 'server.js')))
  t.assert.match(fs.readFileSync(path.join(dir, 'server.js'), 'utf8'), /^import /m)
})
