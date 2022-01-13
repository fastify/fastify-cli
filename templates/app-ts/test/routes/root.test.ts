import { test } from 'tap'
import { buildApplication } from '../helper'

test('default root route', async (t) => {
  const app = await buildApplication(t)

  const res = await app.inject({
    url: '/'
  })
  t.same(JSON.parse(res.payload), { root: true })
})
