'use strict'

const { test } = require('node:test')
const { spawn } = require('node:child_process')
const { once } = require('node:events')
const path = require('node:path')
const net = require('node:net')

const cliPath = path.join(__dirname, '..', 'cli.js')
const pluginPath = path.join(__dirname, 'data', 'delayed-close-plugin.js')
// Windows kill() terminates processes rather than delivering catchable POSIX signals.
const testOptions = { timeout: 15000, skip: process.platform === 'win32' }
const signals = [
  { signal: 'SIGINT', expectedCode: 130 },
  { signal: 'SIGTERM', expectedCode: 143 }
]
const targets = ['parent only']
// Negative PIDs address process groups on POSIX, but are not supported on Windows.
if (process.platform !== 'win32') targets.push('process group')

async function getAvailablePort (t) {
  const server = net.createServer().listen(0, '127.0.0.1')
  t.after(() => server.close())
  await once(server, 'listening')
  const { port } = server.address()
  await new Promise(resolve => server.close(resolve))
  return port
}

async function startWatcher (t) {
  const port = await getAvailablePort(t)
  const child = spawn(process.execPath, [
    cliPath, 'start', '--watch',
    '--port', String(port), '--address', '127.0.0.1',
    '--follow-watch', pluginPath,
    pluginPath
  ], { stdio: ['ignore', 'pipe', 'pipe'], detached: true })

  t.after(() => {
    // Clean up the whole tree even when the test signals only the supervisor.
    try {
      process.kill(-child.pid, 'SIGKILL')
    } catch (err) {
      if (err.code !== 'ESRCH') throw err
    }
  })

  let stdout = ''
  let stderr = ''
  let outputAtExit = ''
  child.stderr.on('data', chunk => { stderr += chunk })
  child.once('exit', () => { outputAtExit = stdout })
  const closed = once(child, 'close')
  const ready = new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', () => reject(new Error(`Watcher exited before ready: ${stderr}`)))
    child.stdout.on('data', chunk => {
      stdout += chunk
      if (stdout.includes('application-ready')) resolve()
    })
  })

  return { child, ready, closed, outputAtExit: () => outputAtExit, errors: () => stderr }
}

for (const { signal, expectedCode } of signals) {
  for (const target of targets) {
    test(`should await application cleanup on ${signal} (${target})`, testOptions, async t => {
      const processGroup = target === 'process group'
      const watcher = await startWatcher(t)
      await watcher.ready

      if (processGroup) {
        process.kill(-watcher.child.pid, signal)
      } else {
        watcher.child.kill(signal)
      }
      const [code, exitSignal] = await watcher.closed

      // Checking final stdout alone would also accept cleanup after the parent exited.
      t.assert.match(watcher.outputAtExit(), /application-closed/)
      t.assert.strictEqual(code, expectedCode, watcher.errors())
      t.assert.strictEqual(exitSignal, null)
    })
  }
}
