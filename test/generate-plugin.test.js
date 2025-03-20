'use strict'

// bailout if a test is broken
// so that the folder can be inspected
process.env.TAP_BAIL = true

const t = require('tap')
const {
  mkdirSync,
  readFileSync,
  readFile
} = require('node:fs')
const path = require('node:path')
const rimraf = require('rimraf')
const walker = require('walker')
const { generate, pluginTemplate } = require('../generate-plugin')
const workdir = path.join(__dirname, 'workdir')
const templateDir = path.join(__dirname, '..', 'templates', 'plugin')
const cliPkg = require('../package')
const { exec, execSync } = require('node:child_process')
const strip = require('strip-ansi')
const semver = require('semver')

const expected = {}
const initVersion = execSync('npm get init-version').toString().trim()

;(function (cb) {
  const files = []
  walker(templateDir)
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

          expected[file.replace(templateDir, '').replace(/__/, '.')] = data.toString()

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

  beforeEach(() => {
    rimraf.sync(workdir)
    mkdirSync(workdir, { recursive: true })
  })

  test('errors if directory exists', (t) => {
    t.plan(2)
    exec('node generate-plugin.js ./test/workdir', (err, stdout) => {
      t.equal('directory ./test/workdir already exists', strip(stdout.toString().trim()))
      t.equal(1, err.code)
    })
  })

  test('errors if generate doesn\'t have <folder> arguments', (t) => {
    t.plan(2)
    exec('node generate-plugin.js', (err, stdout) => {
      t.equal('must specify a directory to \'fastify generate\'', strip(stdout.toString().trim()))
      t.equal(1, err.code)
    })
  })

  test('errors if package.json exists when use generate .', (t) => {
    t.plan(2)
    exec('node generate-plugin.js .', (err, stdout) => {
      t.equal('a package.json file already exists in target directory. retry with the --integrate flag to proceed', strip(stdout.toString().trim()))
      t.equal(1, err.code)
    })
  })

  test('errors if package.json exists when use generate ./', (t) => {
    t.plan(2)
    exec('node generate-plugin.js ./', (err, stdout) => {
      t.equal('a package.json file already exists in target directory. retry with the --integrate flag to proceed', strip(stdout.toString().trim()))
      t.equal(1, err.code)
    })
  })

  test('errors if folder exists', (t) => {
    t.plan(2)
    exec('node generate-plugin.js test', (err, stdout) => {
      t.equal('directory test already exists', strip(stdout.toString().trim()))
      t.equal(1, err.code)
    })
  })

  test('should finish succesfully', async (t) => {
    t.plan(18 + Object.keys(expected).length)
    try {
      await generate(workdir, pluginTemplate)
      await verifyPkg(t)
      await verifyCopy(t, expected)
      await verifyFastifyPluginVersion(t)
    } catch (err) {
      t.error(err)
    }
  })

  function verifyFastifyPluginVersion (t) {
    return new Promise((resolve, reject) => {
      const pluginPath = path.join(workdir, 'index.js')
      const plugin = require(pluginPath)
      const pkgPath = path.join(__dirname, '../', 'package.json')
      const pkg = require(pkgPath)
      const pluginMeta = plugin[Symbol.for('plugin-meta')]
      const pluginVersion = pluginMeta.fastify
      const pkgVersion = pkg.dependencies.fastify
      const satified = semver.intersects(pluginVersion, pkgVersion)
      t.ok(satified, 'meta should be the same')
      resolve()
    })
  }

  function verifyPkg (t) {
    return new Promise((resolve, reject) => {
      const pkgFile = path.join(workdir, 'package.json')

      readFile(pkgFile, function (err, data) {
        err && reject(err)
        const pkg = JSON.parse(data)
        t.equal(pkg.name, 'workdir')
        t.equal(pkg.main, 'index.js')
        t.equal(pkg.types, 'index.d.ts')
        // we are not checking author because it depends on global npm configs
        t.equal(pkg.version, initVersion)
        t.equal(pkg.description, '')
        t.ok(pkg.license === 'MIT')
        t.equal(pkg.scripts.lint, 'standard && npm run lint:typescript')
        t.equal(pkg.scripts['lint:typescript'], 'ts-standard')
        t.equal(pkg.scripts.test, 'npm run lint && npm run unit && npm run test:typescript')
        t.equal(pkg.scripts['test:typescript'], 'tsd')
        t.equal(pkg.scripts.unit, 'node --test')
        t.equal(pkg.dependencies['fastify-plugin'], cliPkg.dependencies['fastify-plugin'])
        t.equal(pkg.devDependencies['@types/node'], cliPkg.devDependencies['@types/node'])
        t.equal(pkg.devDependencies.fastify, cliPkg.devDependencies.fastify)
        t.equal(pkg.devDependencies.standard, cliPkg.devDependencies.standard)
        t.equal(pkg.devDependencies.tsd, cliPkg.devDependencies.tsd)
        t.equal(pkg.devDependencies.typescript, cliPkg.devDependencies.typescript)
        t.same(pkg.tsd, pluginTemplate.tsd)

        resolve()
      })
    })
  }

  function verifyCopy (t, expected) {
    const pkgFile = path.join(workdir, 'package.json')
    const githubDir = path.join(workdir, '.github', 'workflows', 'ci.yml')
    return new Promise((resolve, reject) => {
      walker(workdir)
        .on('file', function (file) {
          if (file === pkgFile || file === githubDir) {
            return
          }
          try {
            const data = readFileSync(file)
            file = file.replace(workdir, '')
            t.same(data.toString().replace(/\r\n/g, '\n'), expected[file], file + ' matching')
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
