'use strict'

const { test } = require('node:test')
const { execSync } = require('node:child_process')
const { mkdirSync, readFileSync } = require('node:fs')
const path = require('node:path')
const rimraf = require('rimraf')

test('generate', async () => {
  const workdir = path.join(__dirname, 'workdir')
  const target = path.join(workdir, 'cli.test')

  rimraf.sync(workdir)
  mkdirSync(workdir, { recursive: true })

  execSync(`node cli.js generate ${target}`)
})

test('help', async t => {
  t.assert.equal(
    execSync('node cli.js', { encoding: 'utf-8' }),
    readFileSync(path.join(__dirname, '../help/help.txt'), 'utf-8')
  )
})

test('--help', async t => {
  t.assert.equal(
    execSync('node cli.js --help', { encoding: 'utf-8' }),
    readFileSync(path.join(__dirname, '../help/help.txt'), 'utf-8')
  )
})

test('generate --help', async t => {
  t.assert.equal(
    execSync('node cli.js generate --help', { encoding: 'utf-8' }),
    readFileSync(path.join(__dirname, '../help/generate.txt'), 'utf-8')
  )
})
