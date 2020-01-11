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
const appTemplateDir = path.join(__dirname, '..', 'templates', 'app')
const cliPkg = require('../package')
const { exec } = require('child_process')
const minimatch = require('minimatch')
const expected = {}

;(function (cb) {
  var files = []
  walker(appTemplateDir)
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

          expected[file.replace(appTemplateDir, '').replace(/__/, '.')] = data.toString()

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

  test('errors if generate doesn\'t have <folder> arguments', (t) => {
    t.plan(2)
    exec('node generate.js', (err, stdout) => {
      t.is('must specify a directory to \'fastify generate\'', stdout.toString().trim())
      t.is(1, err.code)
    })
  })

  test('errors if package.json exists when use generate .', (t) => {
    t.plan(2)
    exec('node generate.js .', (err, stdout) => {
      t.is('a package.json file already exists in target directory', stdout.toString().trim())
      t.is(1, err.code)
    })
  })

  test('errors if package.json exists when use generate ./', (t) => {
    t.plan(2)
    exec('node generate.js ./', (err, stdout) => {
      t.is('a package.json file already exists in target directory', stdout.toString().trim())
      t.is(1, err.code)
    })
  })

  test('errors if folder exists', (t) => {
    t.plan(2)
    exec('node generate.js test', (err, stdout) => {
      t.is('directory test already exists', stdout.toString().trim())
      t.is(1, err.code)
    })
  })

  test('should finish succesfully', (t) => {
    t.plan(15 + Object.keys(expected).length * 2)

    generate(workdir, function (err) {
      t.error(err)
      verifyPkg(t)
      verifyCopy(t)
    })
  })

  function verifyPkg (t) {
    const pkgFile = path.join(workdir, 'package.json')

    readFile(pkgFile, function (err, data) {
      t.error(err)
      const pkg = JSON.parse(data)
      t.equal(pkg.name, 'workdir')
      // we are not checking author because it depends on global npm configs
      t.equal(pkg.version, '1.0.0')
      t.equal(pkg.description, '')
      // by default this will be ISC but since we have a MIT licensed pkg file in upper dir, npm will set the license to MIT in this case
      // so for local tests we need to accept MIT as well
      t.ok(pkg.license === 'ISC' || pkg.license === 'MIT')
      t.equal(pkg.scripts.test, 'tap test/**/*.test.js')
      t.equal(pkg.scripts.start, 'fastify start -l info app.js')
      t.equal(pkg.scripts.dev, 'fastify start -w -l info -P app.js')
      t.equal(pkg.dependencies['fastify-cli'], '^' + cliPkg.version)
      t.equal(pkg.dependencies.fastify, cliPkg.dependencies.fastify)
      t.equal(pkg.dependencies['fastify-plugin'], cliPkg.devDependencies['fastify-plugin'] || cliPkg.dependencies['fastify-plugin'])
      t.equal(pkg.dependencies['fastify-autoload'], cliPkg.devDependencies['fastify-autoload'])
      t.equal(pkg.devDependencies.tap, cliPkg.devDependencies.tap)

      const testGlob = pkg.scripts.test.split(' ')[1]
      t.equal(minimatch.match(['test/services/plugins/more/test/here/ok.test.js'], testGlob).length, 1)
    })
  }

  function verifyCopy (t) {
    const pkgFile = path.join(workdir, 'package.json')

    walker(workdir)
      .on('file', function (file) {
        if (file === pkgFile) {
          return
        }

        readFile(file, function (err, data) {
          t.notOk(err)
          file = file.replace(workdir, '')
          t.deepEqual(data.toString().replace(/\r\n/g, '\n'), expected[file], file + ' matching')
        })
      })
  }
}
