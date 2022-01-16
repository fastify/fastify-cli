'use strict'

const t = require('tap')
const { execSync } = require('child_process')
const { mkdirSync } = require('fs')
const path = require('path')
const rimraf = require('rimraf')

const workdir = path.join(__dirname, 'workdir')
const target = path.join(workdir, 'cli.test')

t.plan(1)

rimraf.sync(workdir)
mkdirSync(workdir, { recursive: true })

execSync(`node cli.js generate ${target}`)

t.pass()
