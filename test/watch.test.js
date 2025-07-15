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

  const expectRegExp = /(node_modules|build|dist|\.git|bower_components|logs)/
  const regExp = arrayToRegExp(['node_modules', 'build', 'dist', '.git', 'bower_components', 'logs'])

  t.assert.deepStrictEqual(regExp, expectRegExp)
})
