'use strict'

// bailout if a test is broken
// so that the folder can be inspected
process.env.TAP_BAIL = true

const t = require('tap')
const {
  mkdirSync,
  readFileSync,
  readFile
} = require('fs')
const path = require('path')
const rimraf = require('rimraf')
const walker = require('walker')
const workdir = path.join(__dirname, 'workdir')
const appTemplateDir = path.join(__dirname, '..', 'templates', 'eject-esm')
const { eject, cli } = require('../eject')
const expected = {};

(function (cb) {
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

          expected[
            file.replace(appTemplateDir, '').replace(/__/, '.')
          ] = data.toString()

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

  test('should finish succesfully with template', async (t) => {
    try {
      const template = 'eject-esm'
      await eject(workdir, template)
      await verifyCopy(t, expected)
    } catch (err) {
      t.error(err)
    }
  })

  test('should finish successfully with cli', async (t) => {
    try {
      process.chdir(workdir)
      await cli(['--esm'])
      await verifyCopy(t, expected)
    } catch (err) {
      t.error(err)
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
            t.same(
              data.toString().replace(/\r\n/g, '\n'),
              expected[file],
              file + ' matching'
            )
          } catch (err) {
            reject(err)
          }
        })
        .on('end', function () {
          t.equal(Object.keys(expected).length, count)
          resolve()
        })
        .on('error', function (err, entry, stat) {
          reject(err)
        })
    })
  }
}
