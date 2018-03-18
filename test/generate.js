'use strict'

// bailout if a test is broken
// so that the folder can be inspected
process.env.TAP_BAIL = true

const {
  beforeEach,
  test
} = require('tap')
const {
  writeFile,
  readFile
} = require('fs')
const path = require('path')
const rimraf = require('rimraf')
const mkdirp = require('mkdirp')
const { generate } = require('../generate')
const workdir = path.join(__dirname, 'workdir')

beforeEach((cb) => {
  rimraf(workdir, () => {
    // skip any errors

    mkdirp(workdir, cb)
  })
})

test('errors if package.json is not there', (t) => {
  t.plan(2)

  generate(workdir, function (err) {
    t.ok(err)
    t.equal(err.code, 'ENOENT')
  })
})

test('finish succesfully if package.json is there', (t) => {
  t.plan(6)

  const pkgFile = path.join(workdir, 'package.json')

  writeFile(pkgFile, JSON.stringify({
    name: 'an-app',
    version: '0.0.1',
    description: 'whaat',
    main: 'index.js',
    scripts: {}
  }), function (err) {
    t.error(err)

    generate(workdir, function (err) {
      t.error(err)

      readFile(pkgFile, function (err, data) {
        t.error(err)

        const pkg = JSON.parse(data)
        t.equal(pkg.scripts.test, 'standard | snazzy && tap test/*/*.test.js')
        t.equal(pkg.scripts.start, 'fastify-cli app.js')
        t.equal(pkg.scripts.colada, 'fastify-cli -l info -P app.js')
      })
    })
  })
})
