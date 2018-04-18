'use strict'

// bailout if a test is broken
// so that the folder can be inspected
process.env.TAP_BAIL = true

const t = require('tap')
const {
  writeFile,
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

  test('errors if package.json is not there', (t) => {
    t.plan(2)

    generate(workdir, function (err) {
      t.ok(err)
      t.equal(err.code, 'ENOENT')
    })
  })

  test('finish succesfully if package.json is there - npm', (t) => {
    t.plan(14 + Object.keys(expected).length * 2)

    const pkgFile = path.join(workdir, 'package.json')
    const pkgContent = JSON.stringify({
      name: 'an-npm-app',
      version: '0.0.1',
      description: 'whaat',
      main: 'index.js',
      scripts: {}
    }, null, 2)

    writeFile(pkgFile, pkgContent, function (err) {
      t.error(err)
      generate(workdir, function (err) {
        t.error(err)
        verifyPkg(t, pkgFile, pkgContent)
        verifyCopy(t, pkgFile)
      })
    })
  })

  test('finish succesfully if package.json is there - yarn', (t) => {
    t.plan(14 + Object.keys(expected).length * 2)

    const pkgFile = path.join(workdir, 'package.json')
    const pkgContent = JSON.stringify({
      name: 'an-yarn-app',
      version: '0.0.1',
      description: 'whaat',
      main: 'index.js'
    }, null, 2)
    writeFile(pkgFile, pkgContent, function (err) {
      t.error(err)

      generate(workdir, function (err) {
        t.error(err)
        verifyPkg(t, pkgFile, pkgContent)
        verifyCopy(t, pkgFile)
      })
    })
  })

  function verifyPkg (t, pkgFile, pkgContent) {
    readFile(pkgFile, function (err, data) {
      t.error(err)
      t.equal(data.toString().split('"main"')[0], pkgContent.split('"main"')[0])
      const pkg = JSON.parse(data)
      t.equal(pkg.scripts.test, 'standard && tap test/*.test.js test/*/*.test.js test/*/*/*.test.js')
      t.equal(pkg.scripts.start, 'fastify start -l info app.js')
      t.equal(pkg.scripts.dev, 'fastify start -l info -P app.js')
      t.equal(pkg.scripts.lint, 'standard --fix')
      t.equal(pkg.dependencies['fastify-cli'], '^' + cliPkg.version)
      t.equal(pkg.dependencies['fastify'], cliPkg.dependencies.fastify)
      t.equal(pkg.dependencies['fastify-plugin'], cliPkg.devDependencies['fastify-plugin'] || cliPkg.dependencies['fastify-plugin'])
      t.equal(pkg.dependencies['fastify-autoload'], cliPkg.devDependencies['fastify-autoload'])
      t.equal(pkg.devDependencies['standard'], cliPkg.devDependencies['standard'])
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
