'use strict'

const { test } = require('node:test')
const path = require('node:path')
const net = require('node:net')
const { fork } = require('node:child_process')
const { once } = require('node:events')
const { GRACEFUL_SHUT } = require('../lib/watch/constants')

const forkPath = path.join(__dirname, '..', 'lib', 'watch', 'fork.js')

// Every test forks a real child: kill it on teardown so a stuck child
// cannot hang the whole suite, and fail fast through the test timeout.
const testOptions = { timeout: 30000 }

function forkChild (t, args) {
  const child = fork(forkPath, args, {
    env: { ...process.env, childEvent: 'start' },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc']
  })
  t.after(() => { if (child.exitCode === null) child.kill('SIGKILL') })
  let stdout = ''
  child.stdout.on('data', chunk => { stdout += chunk })
  child.stderr.on('data', chunk => { stdout += chunk })
  const message = (type) => new Promise(resolve => {
    child.on('message', function onMessage (msg) {
      if (msg.type === type) {
        child.off('message', onMessage)
        resolve(msg)
      }
    })
  })
  return { child, message, output: () => stdout }
}

test('should exit with 1 when the app crashes', testOptions, async (t) => {
  const { child, message, output } = forkChild(t, ['-p', '0', './test/data/crashing-plugin.js'])
  await message('ready')
  const [code] = await once(child, 'exit')

  t.assert.strictEqual(code, 1)
  t.assert.match(output(), /async crash/)
  t.assert.match(output(), /app crashed - waiting for file changes/)
})

test('should exit with 1 when the server cannot start', testOptions, async (t) => {
  // bind the blocker and the child to the same address: on macOS a server on
  // [::] does not make 127.0.0.1 busy, so the child would start normally
  const server = net.createServer().listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => server.close())
  const { port } = server.address()

  const { child, output } = forkChild(t, ['-p', String(port), '-a', '127.0.0.1', './examples/plugin.js'])
  const [code] = await once(child, 'exit')

  t.assert.strictEqual(code, 1)
  t.assert.match(output(), /EADDRINUSE/)
})

test('should close the server on graceful shutdown', testOptions, async (t) => {
  const { child, message } = forkChild(t, ['-p', '0', './examples/plugin.js'])
  await message('ready')
  child.send(GRACEFUL_SHUT)
  const [code] = await once(child, 'exit')

  t.assert.strictEqual(code, 0)
})

test('should force the exit when the server does not close in time', testOptions, async (t) => {
  const { child, message, output } = forkChild(t, ['-p', '0', './test/data/hanging-close-plugin.js'])
  await message('ready')
  child.send(GRACEFUL_SHUT)
  const [code] = await once(child, 'exit')

  t.assert.strictEqual(code, 1)
  t.assert.match(output(), /process forced end/)
})

test('should exit immediately on graceful shutdown when the server is not up yet', testOptions, async (t) => {
  const { child } = forkChild(t, ['-p', '0', './test/data/slow-plugin.js'])
  child.send(GRACEFUL_SHUT)
  const [code] = await once(child, 'exit')

  t.assert.strictEqual(code, 0)
})
