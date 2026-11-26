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

test('default watch ignores match whole path segments', () => {
  const dirs = ['node_modules', 'build', 'dist', '.git', 'bower_components', 'logs', '.nyc_output']
  const regExp = arrayToRegExp(dirs)
  for (const separator of ['/', '\\']) {
    const project = ['workspace', 'any-builder'].join(separator)
    assert.strictEqual(regExp.test(project), false)
    assert.strictEqual(regExp.test([project, 'src', 'distribution.js'].join(separator)), false)
    for (const dir of dirs) {
      assert.strictEqual(regExp.test(dir), true)
      assert.strictEqual(regExp.test([project, dir, 'app.js'].join(separator)), true)
    }
  }
})

test('custom watch ignores still support regular expressions', () => {
  const regExp = arrayToRegExp(['build', '.ts$', 'custom-[0-9]+'])
  assert.strictEqual(regExp.test('src/app.ts'), true)
  assert.strictEqual(regExp.test('src/app.ts.js'), false)
  assert.strictEqual(regExp.test('src/custom-12/file.js'), true)
})
