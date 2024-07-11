import * as assert from 'node:assert'
import { test } from 'node:test'
import { build } from '../helper'

test('default root route', async (t) => {
  const app = await build(t)

  const res = await app.inject({
    url: '/',
  })
  assert.deepStrictEqual(JSON.parse(res.payload), { root: true })
})
