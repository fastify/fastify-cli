'use strict'

const { arrayToRegExp } = require('../lib/watch/utils')

const { test } = require('node:test')
const assert = require('node:assert')
const proxyquire = require('proxyquire')
const sinon = require('sinon')

test('followWatch parameter should set watchDir correctly', async (t) => {
  const chokidarMock = {
    watch: sinon.stub().returns({
      close: sinon.stub(),
      on: sinon.stub().returns({
        on: sinon.stub()
      })
    })
  }

  const watch = proxyquire('../lib/watch', {
    chokidar: chokidarMock
  })

  const testDir = 'test-dir'
  const emitter1 = watch(['app.js'], 'node_modules', false, testDir)

  assert.strictEqual(chokidarMock.watch.calledOnce, true)
  assert.strictEqual(chokidarMock.watch.firstCall.args[0], testDir)

  emitter1.stop()
  chokidarMock.watch.resetHistory()

  const emitter2 = watch(['app.js'], 'node_modules', false)

  assert.strictEqual(chokidarMock.watch.calledOnce, true)
  assert.strictEqual(chokidarMock.watch.firstCall.args[0], process.cwd())

  emitter2.stop()
})

test('should equal expect RegExp', t => {
  t.plan(1)

  const expectRegExp = /(node_modules|build|dist|(?:^|[/\\])\.git(?:[/\\]|$)|bower_components|logs)/
  const regExp = arrayToRegExp(['node_modules', 'build', 'dist', '.git', 'bower_components', 'logs'])

  t.assert.deepStrictEqual(regExp, expectRegExp)
})

test('.git ignore should only match complete path segments', t => {
  const regExp = arrayToRegExp(['.git'])

  for (const separator of ['/', '\\']) {
    for (const filepath of [
      '.git',
      '.git/',
      '.git/HEAD',
      'app/.git',
      '/work/app/.git/objects/pack',
      'C:/work/app/.git/HEAD',
      '//server/share/app/.git/HEAD',
      '/work/fastify.git/main/.git'
    ]) {
      const filename = filepath.replaceAll('/', separator)
      t.assert.strictEqual(regExp.test(filename), true, filename)
    }

    for (const filepath of [
      'fastify.git',
      'fastify.git/main',
      '/work/fastify.git/main/app.js',
      'C:/work/ordinary.git/app.js',
      '//server/share/ordinary.git/app.js',
      '/work/.github/app.js',
      '/work/app/.gitignore',
      '/work/app/.gitconfig',
      '/work/app/.git-backup/app.js'
    ]) {
      const filename = filepath.replaceAll('/', separator)
      t.assert.strictEqual(regExp.test(filename), false, filename)
    }
  }
})

test('default ignores should allow compiled apps in .git-suffixed directories', t => {
  const { ignoreWatch } = require('../args')(['--ignore-watch=.ts$'])
  const regExp = arrayToRegExp(ignoreWatch.split(' ').filter(Boolean))

  for (const separator of ['/', '\\']) {
    const filename = filepath => filepath.replaceAll('/', separator)
    t.assert.strictEqual(regExp.test(filename('/work/fastify.git/main')), false)
    t.assert.strictEqual(regExp.test(filename('/work/fastify.git/main/dist/app.js')), false)
    t.assert.strictEqual(regExp.test(filename('/work/ordinary.git/dist/app.js')), false)
    t.assert.strictEqual(regExp.test(filename('/work/fastify.git/main/.git')), true)
    t.assert.strictEqual(regExp.test(filename('/work/ordinary.git/.git/HEAD')), true)
    t.assert.strictEqual(regExp.test(filename('/work/fastify.git/main/app.ts')), true)

    for (const entry of ['node_modules', 'build', 'bower_components', 'logs', '.swp', '.nyc_output']) {
      t.assert.strictEqual(regExp.test(filename(`/work/app/${entry}/file`)), true)
    }
  }
})

test('custom ignore expressions should retain their matching behavior', t => {
  const expressions = ['\\.git', '.ts$', 'logs/error.log', '^generated[/\\\\]']
  const expected = /(\.git|\.ts$|logs\/error.log|^generated[/\\])/
  const regExp = arrayToRegExp(expressions)

  t.assert.deepStrictEqual(regExp, expected)
  t.assert.strictEqual(regExp.test('/work/fastify.git/main/app.js'), true)
  t.assert.strictEqual(regExp.test('/work/app/app.ts'), true)
  t.assert.strictEqual(regExp.test('/work/app/app.tsx'), false)
  t.assert.strictEqual(regExp.test('/work/app/logs/error.log'), true)
  t.assert.strictEqual(regExp.test('generated/app.js'), true)
  t.assert.strictEqual(regExp.test('generated\\app.js'), true)
})
