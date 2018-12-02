'use strict'

const t = require('tap')
const { execSync } = require('child_process')
const path = require('path')
const mkdirp = require('mkdirp')
const rimraf = require('rimraf')

const workdir = path.join(__dirname, 'workdir')
const target = path.join(workdir, 'cli.test')

rimraf(workdir, () => {
  mkdirp.sync(workdir)
  t.plan(1)

  execSync(`node cli.js generate ${target}`)

  t.pass()
})
