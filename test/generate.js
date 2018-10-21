'use strict'

// bailout if a test is broken
// so that the folder can be inspected
process.env.TAP_BAIL = true

const t = require('tap')
const {
  readFile
} = require('fs')
const path = require('path')
const rimraf = require('rimraf')
const mkdirp = require('mkdirp')
const walker = require('walker')
const { generate } = require('../generate')
const workdir = path.join(__dirname, 'workdir')
const templatedir = path.join(__dirname, '..', 'app_template')
const cliPkg = require('../package')
const { exec } = require('child_process')
const expected = {}

;(function (cb) {
  var files = []
  walker(templatedir)
    .on('file', function (file) {
      files.push(file)
    })
    .on('end', function () {
      var count = 0
      files.forEach(function (file) {
        readFile(file, function (err, data) {
          if (err) {
            return cb(err)
          }

          expected[file.replace(templatedir, '')] = data.toString()

          count++
          if (count === files.length) {
            cb(null)
          }
        })
      })
    })
    .on('error', cb)
})(function (err) {
  t.error(err)
  define(t)
})

function define (t) {
  const { beforeEach, test } = t

  beforeEach((cb) => {
    rimraf(workdir, () => {
      // skip any errors

      mkdirp(workdir, cb)
    })
  })

  test('errors if directory exists', (t) => {
    t.plan(2)
    exec('node generate.js ./test/workdir', (err, stdout) => {
      t.is('directory ./test/workdir already exists', stdout.toString().trim())
      t.is(1, err.code)
    })
  })

  test('errors if pkgfile exists', (t) => {
    t.plan(2)
    exec('node generate.js', (err, stdout) => {
      t.is('a package.json file already exists in target directory', stdout.toString().trim())
      t.is(1, err.code)
    })
  })

  test('finish succesfully if package.json is there - npm', (t) => {
    t.plan(13 + Object.keys(expected).length * 2)

    const pkgFile = path.join(workdir, 'package.json')
    const bindings = {
      name: 'an-app',
      version: '0.0.1',
      description: 'whaat',
      author: 'fastify',
      license: 'MIT'
    }

    generate(workdir, bindings, function (err) {
      t.error(err)
      verifyPkg(t, pkgFile)
      verifyCopy(t, pkgFile)
    })
  })

  function verifyPkg (t, pkgFile) {
    readFile(pkgFile, function (err, data) {
      t.error(err)
      const pkg = JSON.parse(data)
      t.equal(pkg.name, 'an-app')
      t.equal(pkg.version, '0.0.1')
      t.equal(pkg.description, 'whaat')
      t.equal(pkg.author, 'fastify')
      t.equal(pkg.license, 'MIT')
      t.equal(pkg.scripts.test, 'tap test/*.test.js test/*/*.test.js test/*/*/*.test.js')
      t.equal(pkg.scripts.start, 'fastify start -l info app.js')
      t.equal(pkg.scripts.dev, 'fastify start -l info -P app.js')
      t.equal(pkg.dependencies['fastify-cli'], '^' + cliPkg.version)
      t.equal(pkg.dependencies['fastify'], cliPkg.dependencies.fastify)
      t.equal(pkg.dependencies['fastify-plugin'], cliPkg.devDependencies['fastify-plugin'] || cliPkg.dependencies['fastify-plugin'])
      t.equal(pkg.dependencies['fastify-autoload'], cliPkg.devDependencies['fastify-autoload'])
      t.equal(pkg.devDependencies['tap'], cliPkg.devDependencies['tap'])
    })
  }

  function verifyCopy (t, pkgFile) {
    walker(workdir)
      .on('file', function (file) {
        if (file === pkgFile) {
          return
        }

        readFile(file, function (err, data) {
          t.notOk(err)
          file = file.replace(workdir, '')
          t.deepEqual(data.toString(), expected[file], file + ' matching')
        })
      })
  }
}
