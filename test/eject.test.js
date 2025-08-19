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
const workdir = path.join(__dirname, 'workdir')
const appTemplateDir = path.join(__dirname, '..', 'templates', 'eject')
const { eject, cli } = require('../eject')
const expected = {}

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

  test('should finish succesfully with template', async (t) => {
    try {
      const template = 'eject'
      await eject(workdir, template)
      await verifyCopy(t, expected)
    } catch (err) {
      t.assert.ifError(err)
    }
  })

  test('should finish successfully with cli', async (t) => {
    try {
      process.chdir(workdir)
      await cli([])
      await verifyCopy(t, expected)
    } catch (err) {
      t.assert.ifError(err)
    }
  })

  function verifyCopy (t, expected) {
    return new Promise((resolve, reject) => {
      let count = 0
      walker(workdir)
        .on('file', function (file) {
          count++
          try {
            const data = readFileSync(file)
            file = file.replace(workdir, '')
            t.assert.deepStrictEqual(data.toString().replace(/\r\n/g, '\n'), expected[file], file + ' matching')
          } catch (err) {
            reject(err)
          }
        })
        .on('end', function () {
          t.assert.strictEqual(Object.keys(expected).length, count)
          resolve()
        })
        .on('error', function (err, entry, stat) {
          reject(err)
        })
    })
  }
}
