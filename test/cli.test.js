'use strict'

const t = require('tap')
const { execSync } = require('child_process')
const { mkdirSync, readFileSync } = require('fs')
const path = require('path')
const rimraf = require('rimraf')

t.test('generate', async (t) => {
  const workdir = path.join(__dirname, 'workdir')
  const target = path.join(workdir, 'cli.test')

  rimraf.sync(workdir)
  mkdirSync(workdir, { recursive: true })

  execSync(`node cli.js generate ${target}`)
})

t.test('help', async t => {
  t.equal(
    execSync('node cli.js', { encoding: 'utf-8' }),
    readFileSync(path.join(__dirname, '../help/help.txt'), 'utf-8')
  )
})
