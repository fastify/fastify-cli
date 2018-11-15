const { arrayToRegExp } = require('../lib/watch/utils')
const { IGNORE_WATCH } = require('../lib/watch/constants')

const t = require('tap')
const test = t.test

test('should equal expect RegExp', t => {
  t.plan(1)

  const expectRegExp = /(node_modules|build|dist|\.git|bower_components|logs)/
  const regExp = arrayToRegExp(IGNORE_WATCH)

  t.deepEqual(regExp, expectRegExp)
})
