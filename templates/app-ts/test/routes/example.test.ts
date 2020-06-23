import { test } from 'tap'
import { build } from '../helper'

test('example is loaded', async (t) => {
  const app = build(t)

  const res = await app.inject({
    url: '/example'
  })

  t.equal(res.payload, 'this is an example')
})
