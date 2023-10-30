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
    exec('node generate.js --lang=ts ./test/workdir --esm', (err, stdout) => {
      t.equal('directory ./test/workdir already exists', strip(stdout.toString().trim()))
      t.equal(1, err.code)
    })
  })

  test('errors if generate doesn\'t have <folder> arguments', (t) => {
    t.plan(2)
    exec('node generate.js --lang=ts', (err, stdout) => {
      t.equal('must specify a directory to \'fastify generate\'', strip(stdout.toString().trim()))
      t.equal(1, err.code)
    })
  })

  test('errors if package.json exists when use generate .', (t) => {
    t.plan(2)
    exec('node generate.js --lang=ts .', (err, stdout) => {
      t.equal('a package.json file already exists in target directory', strip(stdout.toString().trim()))
      t.equal(1, err.code)
    })
  })

  test('errors if package.json exists when use generate ./', (t) => {
    t.plan(2)
    exec('node generate.js --lang=ts ./', (err, stdout) => {
      t.equal('a package.json file already exists in target directory', strip(stdout.toString().trim()))
      t.equal(1, err.code)
    })
  })

  test('errors if folder exists', (t) => {
    t.plan(2)
    exec('node generate.js --lang=ts test', (err, stdout) => {
      t.equal('directory test already exists', strip(stdout.toString().trim()))
      t.equal(1, err.code)
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
      t.error(err)
    }
  })

  function verifyPkg (t) {
    return new Promise((resolve, reject) => {
      const pkgFile = path.join(workdir, 'package.json')

      readFile(pkgFile, function (err, data) {
        t.error(err)
        const pkg = JSON.parse(data)
        t.equal(pkg.name, 'workdir')
        // we are not checking author because it depends on global npm configs
        t.equal(pkg.version, initVersion)
        t.equal(pkg.description, 'This project was bootstrapped with Fastify-CLI.')
        // by default this will be ISC but since we have a MIT licensed pkg file in upper dir, npm will set the license to MIT in this case
        // so for local tests we need to accept MIT as well
        t.ok(pkg.license === 'ISC' || pkg.license === 'MIT')
        t.equal(pkg.scripts.test, 'npm run build:ts && tsc -p test/tsconfig.json && tap --ts "test/**/*.test.ts"')
        t.equal(pkg.scripts.start, 'npm run build:ts && fastify start -l info dist/app.js')
        t.equal(pkg.scripts['build:ts'], 'tsc')
        t.equal(pkg.scripts['watch:ts'], 'tsc -w')
        t.equal(pkg.scripts.dev, 'npm run build:ts && concurrently -k -p "[{name}]" -n "TypeScript,App" -c "yellow.bold,cyan.bold" "npm:watch:ts" "npm:dev:start"')
        t.equal(pkg.scripts['dev:start'], 'fastify start --ignore-watch=.ts$ -w -l info -P dist/app.js')
        t.equal(pkg.dependencies['fastify-cli'], '^' + cliPkg.version)
        t.equal(pkg.dependencies.fastify, cliPkg.dependencies.fastify)
        t.equal(pkg.dependencies['fastify-plugin'], cliPkg.devDependencies['fastify-plugin'] || cliPkg.dependencies['fastify-plugin'])
        t.equal(pkg.dependencies['@fastify/autoload'], cliPkg.devDependencies['@fastify/autoload'])
        t.equal(pkg.dependencies['@fastify/sensible'], cliPkg.devDependencies['@fastify/sensible'])
        t.equal(pkg.devDependencies['@types/node'], cliPkg.devDependencies['@types/node'])
        t.equal(pkg.devDependencies['ts-node'], cliPkg.devDependencies['ts-node'])
        t.equal(pkg.devDependencies.concurrently, cliPkg.devDependencies.concurrently)
        t.equal(pkg.devDependencies.tap, cliPkg.devDependencies.tap)
        t.equal(pkg.devDependencies.typescript, cliPkg.devDependencies.typescript)

        const testGlob = pkg.scripts.test.split(' ', 11)[10].replace(/"/g, '')

        t.equal(minimatch.match(['test/routes/plugins/more/test/here/ok.test.ts'], testGlob).length, 1)
        resolve()
      })
    })
  }

  function verifyTSConfig (t) {
    const tsConfigFile = path.join(workdir, 'tsconfig.json')

    readFile(tsConfigFile, function (err, data) {
      t.error(err)
      const tsConfig = JSON.parse(data)

      t.equal(tsConfig.extends, 'fastify-tsconfig')
      t.equal(tsConfig.compilerOptions.outDir, 'dist')
      t.same(tsConfig.include, ['src/**/*.ts'])
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
