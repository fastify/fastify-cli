'use strict'

const { test } = require('node:test')
const { spawn } = require('node:child_process')
const { once } = require('node:events')
const path = require('node:path')
const net = require('node:net')

const cases = ['SIGINT', 'SIGTERM'].flatMap(signal =>
  (process.platform === 'win32' ? [false] : [false, true]).map(group => ({ signal, group }))
)

for (const { signal, group } of cases) {
  test(`watch supervisor waits for application cleanup on ${signal} (${group ? 'process group' : 'parent only'})`, { timeout: 15000 }, async t => {
    const reservation = net.createServer().listen(0, '127.0.0.1')
    await once(reservation, 'listening')
    const { port } = reservation.address()
    await new Promise(resolve => reservation.close(resolve))
    const child = spawn(process.execPath, [
      path.join(__dirname, '..', 'cli.js'), 'start', '--watch',
      '--port', String(port), '--address', '127.0.0.1',
      '--follow-watch', path.join(__dirname, 'data', 'delayed-close-plugin.js'),
      path.join(__dirname, 'data', 'delayed-close-plugin.js')
    ], { stdio: ['ignore', 'pipe', 'pipe'], detached: group })
    t.after(() => {
      if (group) {
        try { process.kill(-child.pid, 'SIGKILL') } catch (err) {
          if (err.code !== 'ESRCH') throw err
        }
      } else if (child.exitCode === null && child.signalCode === null) {
        child.kill('SIGKILL')
      }
    })
    let output = ''
    let errors = ''
    child.stderr.on('data', chunk => { errors += chunk })
    const closed = once(child, 'close')
    await new Promise((resolve, reject) => {
      child.once('error', reject)
      child.once('exit', () => reject(new Error(`Exited before ready: ${errors}`)))
      child.stdout.on('data', chunk => {
        output += chunk
        if (output.includes('application-ready')) resolve()
      })
    })
    let outputAtExit
    child.once('exit', () => { outputAtExit = output })
    if (group) process.kill(-child.pid, signal)
    else child.kill(signal)
    const [code, exitSignal] = await closed
    t.assert.match(outputAtExit, /application-closed/)
    t.assert.strictEqual(code, signal === 'SIGINT' ? 130 : 143, errors)
    t.assert.strictEqual(exitSignal, null)
  })
}
