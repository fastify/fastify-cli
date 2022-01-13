import { test } from 'tap'
import { buildApplication } from '../helper'

test('example is loaded', async (t) => {
  const app = await buildApplication(t)

  const res = await app.inject({
    url: '/example'
  })

  t.equal(res.payload, 'this is an example')
})
