'use strict'

const { test } = require('tap')
const { build } = require('./helper')

test('verify decorators', async (t) => {
  const app = build(t)

  t.true(app.hasDecorator('someSupport'))
  t.true(app.hasDecorator('foo'))
})
