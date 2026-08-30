const { run } = require('node:test')
const { spec } = require('node:test/reporters')
const path = require('node:path')
const { glob } = require('glob')

async function main () {
  const [pattern, ...workerExecArgv] = process.argv.slice(2)

  console.info(`Running tests matching ${pattern}`)
  const timeout = 10 * 60 * 1000 // 10 minutes
  const matches = await glob(pattern)
  const resolved = matches.map(file => path.resolve(file))
  const runOptions = { files: resolved, timeout }
  if (workerExecArgv.length > 0) {
    runOptions.execArgv = workerExecArgv
  }
  const testRs = run(runOptions)
    .on('test:fail', () => {
      process.exitCode = 1
    })
    .compose(spec)
  testRs.pipe(process.stdout)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
