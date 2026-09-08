const { run } = require('node:test')
const { spec } = require('node:test/reporters')
const path = require('node:path')
const { glob } = require('glob')

const pattern = process.argv[process.argv.length - 1]

async function main () {
  console.info(`Running tests matching ${pattern}`)
  const timeout = 10 * 60 * 1000 // 10 minutes
  const matches = await glob(pattern, {
    ignore: ['**/node_modules/**', 'test/workdir*/**']
  })
  if (matches.length === 0) {
    throw new Error(`No test files matched ${pattern}`)
  }

  const resolved = matches.map(file => path.resolve(file))
  const runOptions = {
    files: resolved,
    timeout,
    concurrency: 1
  }
  if (pattern.endsWith('.ts') && process.execArgv.some(arg => arg.includes('ts-node/esm'))) {
    runOptions.isolation = 'none'
  }

  const testRs = run(runOptions)
    .on('test:fail', () => {
      process.exitCode = 1
    })
    .compose(spec)

  await new Promise((resolve, reject) => {
    testRs.once('error', reject)
    testRs.once('end', resolve)
    testRs.pipe(process.stdout, { end: false })
  })
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})
