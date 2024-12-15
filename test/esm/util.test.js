import { requireModule } from '../../util.js'
import { resolve, join } from 'node:path'
import t from 'tap'
import * as url from 'node:url'

const test = t.test

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

test('requiring a commonjs module works in an esm project', (t) => {
  t.plan(1)
  const module = requireModule(
    resolve(join(__dirname, './data/custom-logger.cjs'))
  )
  t.strictSame(module, { name: 'Custom Logger', customLevels: { test: 99 } })
})
