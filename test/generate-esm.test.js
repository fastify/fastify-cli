'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const {
  mkdirSync,
  readFileSync,
  readFile,
  promises: fsPromises,
  unlink
} = require('node:fs')
const path = require('node:path')
const { promisify } = require('node:util')
const rimraf = require('rimraf')
const walker = require('walker')
const { generate, javascriptTemplate } = require('../generate')
const workdir = path.join(__dirname, 'workdir')
const appTemplateDir = path.join(__dirname, '..', 'templates', 'app-esm')
const cliPkg = require('../package')
const { exec, execSync } = require('node:child_process')
const pExec = promisify(exec)
const pUnlink = promisify(unlink)
const minimatch = require('minimatch')
const strip = require('strip-ansi')
const expected = {}
const initVersion = execSync('npm get init-version').toString().trim()

javascriptTemplate.dir = 'app-esm'
javascriptTemplate.type = 'module'
javascriptTemplate.devDependencies.c8 = cliPkg.devDependencies.c8
javascriptTemplate.scripts.test = 'node --test test/**/*.test.js'

;(function (cb) {
  const files = []
  walker(appTemplateDir)
    .on('file', function (file) {
      files.push(file)
    })
    .on('end', function () {
      let count = 0
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
  assert.ifError(err)
  define(test)
})

function define (t) {
  const { beforeEach, test } = t

  beforeEach(() => {
    rimraf.sync(workdir)
    mkdirSync(workdir, { recursive: true })
  })

  test('errors if directory exists', (t, done) => {
    t.plan(2)
    exec('node generate.js ./test/workdir --esm', (err, stdout) => {
      t.assert.strictEqual('directory ./test/workdir already exists', strip(stdout.toString().trim()))
      t.assert.strictEqual(1, err.code)
      done()
    })
  })

  test('errors if generate doesn\'t have <folder> arguments', (t, done) => {
    t.plan(2)
    exec('node generate.js --esm', (err, stdout) => {
      t.assert.strictEqual('must specify a directory to \'fastify generate\'', strip(stdout.toString().trim()))
      t.assert.strictEqual(1, err.code)
      done()
    })
  })

  test('errors if package.json exists when use generate . and integrate flag is not set', (t, done) => {
    t.plan(2)
    exec('node generate.js . --esm', (err, stdout) => {
      t.assert.strictEqual('a package.json file already exists in target directory. retry with the --integrate flag to proceed', strip(stdout.toString().trim()))
      t.assert.strictEqual(1, err.code)
      done()
    })
  })

  test('errors if package.json exists when use generate ./ and integrate flag is not set', (t, done) => {
    t.plan(2)
    exec('node generate.js ./ --esm', (err, stdout) => {
      t.assert.strictEqual('a package.json file already exists in target directory. retry with the --integrate flag to proceed', strip(stdout.toString().trim()))
      t.assert.strictEqual(1, err.code)
      done()
    })
  })

  test('errors if folder exists', (t, done) => {
    t.plan(2)
    exec('node generate.js test --esm', (err, stdout) => {
      t.assert.strictEqual('directory test already exists', strip(stdout.toString().trim()))
      t.assert.strictEqual(1, err.code)
      done()
    })
  })

  test('should finish successfully with ESM javascript template', async (t) => {
    t.plan(13 + Object.keys(expected).length)
    try {
      await generate(workdir, javascriptTemplate)
      await verifyPkg(t)
      await verifyCopy(t, expected)
    } catch (err) {
      t.assert.ifError(err)
    }
  })

  test('--integrate option will enhance preexisting package.json and overwrite preexisting files', async (t) => {
    t.plan(13 + Object.keys(expected).length)
    try {
      await generate(workdir, javascriptTemplate)
      await pUnlink(path.join(workdir, 'package.json'))
      await pExec('npm init -y', { cwd: workdir })
      await pExec('node ../../generate . --integrate --esm', { cwd: workdir })
      await verifyPkg(t)
      await verifyCopy(t, expected)
    } catch (err) {
      t.assert.ifError(err)
    }
  })

  test('--standardlint option will add standard lint dependencies and scripts to javascript template', async (t) => {
    const dir = path.join(__dirname, 'workdir-with-lint')
    const cwd = path.join(dir, '..')
    const bin = path.join('..', 'generate')
    rimraf.sync(dir)
    await pExec(`node ${bin} ${dir} --standardlint --esm`, { cwd })

    await verifyPkg(t, dir, 'workdir-with-lint')

    const data = await fsPromises.readFile(path.join(dir, 'package.json'))
    const pkg = JSON.parse(data)
    t.assert.strictEqual(pkg.scripts.pretest, 'standard')
    t.assert.strictEqual(pkg.scripts.lint, 'standard --fix')
    t.assert.strictEqual(pkg.devDependencies.standard, cliPkg.devDependencies.standard)
  })

  function verifyPkg (t, dir = workdir, pkgName = 'workdir') {
    return new Promise((resolve, reject) => {
      const pkgFile = path.join(dir, 'package.json')

      readFile(pkgFile, function (err, data) {
        err && reject(err)
        const pkg = JSON.parse(data)
        t.assert.strictEqual(pkg.name, pkgName)
        // we are not checking author because it depends on global npm configs
        t.assert.strictEqual(pkg.version, initVersion)
        t.assert.strictEqual(pkg.description, 'This project was bootstrapped with Fastify-CLI.')
        // by default this will be ISC but since we have a MIT licensed pkg file in upper dir, npm will set the license to MIT in this case
        // so for local tests we need to accept MIT as well
        t.assert.ok(pkg.license === 'ISC' || pkg.license === 'MIT')
        t.assert.strictEqual(pkg.scripts.test, 'node --test test/**/*.test.js')
        t.assert.strictEqual(pkg.scripts.start, 'fastify start -l info app.js')
        t.assert.strictEqual(pkg.scripts.dev, 'fastify start -w -l info -P app.js')
        t.assert.strictEqual(pkg.dependencies['fastify-cli'], '^' + cliPkg.version)
        t.assert.strictEqual(pkg.dependencies.fastify, cliPkg.dependencies.fastify)
        t.assert.strictEqual(pkg.dependencies['fastify-plugin'], cliPkg.devDependencies['fastify-plugin'] || cliPkg.dependencies['fastify-plugin'])
        t.assert.strictEqual(pkg.dependencies['@fastify/autoload'], cliPkg.devDependencies['@fastify/autoload'])
        t.assert.strictEqual(pkg.dependencies['@fastify/sensible'], cliPkg.devDependencies['@fastify/sensible'])
        // Test for "type:module"
        t.assert.strictEqual(pkg.type, 'module')

        const testGlob = pkg.scripts.test.split(' ', 3)[2].replace(/"/g, '')
        t.assert.strictEqual(minimatch.match(['test/services/plugins/more/test/here/ok.test.js'], testGlob).length, 1)
        resolve()
      })
    })
  }

  function verifyCopy (t, expected) {
    const pkgFile = path.join(workdir, 'package.json')
    return new Promise((resolve, reject) => {
      walker(workdir)
        .on('file', function (file) {
          if (file === pkgFile) {
            return
          }
          try {
            const data = readFileSync(file)
            file = file.replace(workdir, '')
            t.assert.strictEqual(data.toString().replace(/\r\n/g, '\n'), expected[file], file + ' matching')
          } catch (err) {
            reject(err)
          }
        })
        .on('end', function () {
          resolve()
        })
        .on('error', function (err, entry, stat) {
          reject(err)
        })
    })
  }
}
