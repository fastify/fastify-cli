'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const {
  mkdirSync,
  readFileSync,
  readFile
} = require('node:fs')
const path = require('node:path')
const rimraf = require('rimraf')
const walker = require('walker')
const { generate, typescriptTemplate } = require('../generate')
const workdir = path.join(__dirname, 'workdir')
const appTemplateDir = path.join(__dirname, '..', 'templates', 'app-ts')
const cliPkg = require('../package')
const { exec, execSync } = require('node:child_process')
const minimatch = require('minimatch')
const strip = require('strip-ansi')
const expected = {}
const initVersion = execSync('npm get init-version').toString().trim()

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
    exec('node generate.js --lang=ts ./test/workdir', (err, stdout) => {
      t.assert.strictEqual('directory ./test/workdir already exists', strip(stdout.toString().trim()))
      t.assert.strictEqual(1, err.code)
      done()
    })
  })

  test('errors if generate doesn\'t have <folder> arguments', (t, done) => {
    t.plan(2)
    exec('node generate.js --lang=ts', (err, stdout) => {
      t.assert.strictEqual('must specify a directory to \'fastify generate\'', strip(stdout.toString().trim()))
      t.assert.strictEqual(1, err.code)
      done()
    })
  })

  test('errors if package.json exists when use generate .', (t, done) => {
    t.plan(2)
    exec('node generate.js --lang=ts .', (err, stdout) => {
      t.assert.strictEqual('a package.json file already exists in target directory. retry with the --integrate flag to proceed', strip(stdout.toString().trim()))
      t.assert.strictEqual(1, err.code)
      done()
    })
  })

  test('errors if package.json exists when use generate ./', (t, done) => {
    t.plan(2)
    exec('node generate.js --lang=ts ./', (err, stdout) => {
      t.assert.strictEqual('a package.json file already exists in target directory. retry with the --integrate flag to proceed', strip(stdout.toString().trim()))
      t.assert.strictEqual(1, err.code)
      done()
    })
  })

  test('errors if folder exists', (t, done) => {
    t.plan(2)
    exec('node generate.js --lang=ts test', (err, stdout) => {
      t.assert.strictEqual('directory test already exists', strip(stdout.toString().trim()))
      t.assert.strictEqual(1, err.code)
      done()
    })
  })

  test('should finish successfully with typescript template', async (t) => {
    t.plan(25 + Object.keys(expected).length)
    try {
      await generate(workdir, typescriptTemplate)
      await verifyPkg(t)
      await verifyTSConfig(t)
      await verifyCopy(t, expected)
    } catch (err) {
      t.assert.ifError(err)
    }
  })

  function verifyPkg (t) {
    return new Promise((resolve, reject) => {
      const pkgFile = path.join(workdir, 'package.json')

      readFile(pkgFile, function (err, data) {
        t.assert.ifError(err)
        const pkg = JSON.parse(data)
        t.assert.strictEqual(pkg.name, 'workdir')
        // we are not checking author because it depends on global npm configs
        t.assert.strictEqual(pkg.version, initVersion)
        t.assert.strictEqual(pkg.description, 'This project was bootstrapped with Fastify-CLI.')
        // by default this will be ISC but since we have a MIT licensed pkg file in upper dir, npm will set the license to MIT in this case
        // so for local tests we need to accept MIT as well
        t.assert.ok(pkg.license === 'ISC' || pkg.license === 'MIT')
        t.assert.strictEqual(pkg.scripts.test, 'npm run build:ts && tsc -p test/tsconfig.json && c8 node --test -r ts-node/register "test/**/*.ts"')
        t.assert.strictEqual(pkg.scripts.start, 'npm run build:ts && fastify start -l info dist/app.js')
        t.assert.strictEqual(pkg.scripts['build:ts'], 'tsc')
        t.assert.strictEqual(pkg.scripts['watch:ts'], 'tsc -w')
        t.assert.strictEqual(pkg.scripts.dev, 'npm run build:ts && concurrently -k -p "[{name}]" -n "TypeScript,App" -c "yellow.bold,cyan.bold" "npm:watch:ts" "npm:dev:start"')
        t.assert.strictEqual(pkg.scripts['dev:start'], 'fastify start --ignore-watch=.ts$ -w -l info -P dist/app.js')
        t.assert.strictEqual(pkg.dependencies['fastify-cli'], '^' + cliPkg.version)
        t.assert.strictEqual(pkg.dependencies.fastify, cliPkg.dependencies.fastify)
        t.assert.strictEqual(pkg.dependencies['fastify-plugin'], cliPkg.devDependencies['fastify-plugin'] || cliPkg.dependencies['fastify-plugin'])
        t.assert.strictEqual(pkg.dependencies['@fastify/autoload'], cliPkg.devDependencies['@fastify/autoload'])
        t.assert.strictEqual(pkg.dependencies['@fastify/sensible'], cliPkg.devDependencies['@fastify/sensible'])
        t.assert.strictEqual(pkg.devDependencies['@types/node'], cliPkg.devDependencies['@types/node'])
        t.assert.strictEqual(pkg.devDependencies.c8, cliPkg.devDependencies.c8)
        t.assert.strictEqual(pkg.devDependencies['ts-node'], cliPkg.devDependencies['ts-node'])
        t.assert.strictEqual(pkg.devDependencies.concurrently, cliPkg.devDependencies.concurrently)
        t.assert.strictEqual(pkg.devDependencies.typescript, cliPkg.devDependencies.typescript)

        const testGlob = pkg.scripts.test.split(' ', 14)[13].replaceAll('"', '')

        t.assert.strictEqual(minimatch.match(['test/routes/plugins/more/test/here/ok.test.ts'], testGlob).length, 1, 'should match glob')
        resolve()
      })
    })
  }

  function verifyTSConfig (t) {
    const tsConfigFile = path.join(workdir, 'tsconfig.json')

    readFile(tsConfigFile, function (err, data) {
      t.assert.ifError(err)
      const tsConfig = JSON.parse(data)

      t.assert.strictEqual(tsConfig.extends, 'fastify-tsconfig')
      t.assert.strictEqual(tsConfig.compilerOptions.outDir, 'dist')
      t.assert.deepStrictEqual(tsConfig.include, ['src/**/*.ts'])
    })
  }

  function verifyCopy (t, expected) {
    const pkgFile = path.join(workdir, 'package.json')
    const tsConfigFile = path.join(workdir, 'tsconfig.json')
    return new Promise((resolve, reject) => {
      walker(workdir)
        .on('file', function (file) {
          if (file === pkgFile || file === tsConfigFile) {
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
