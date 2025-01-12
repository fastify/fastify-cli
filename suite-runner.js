const { run } = require('node:test')
const { spec } = require('node:test/reporters')
const path = require('node:path')
const { glob } = require('glob')

const pattern = process.argv[process.argv.length - 1]

console.info(`Running tests matching ${pattern}`)
const timeout = 10 * 60 * 1000 // 10 minutes
glob(pattern, (err, matches) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  const resolved = matches.map(file => path.resolve(file))
  const testRs = run({ files: resolved, timeout })
    .on('test:fail', () => {
      process.exitCode = 1
    })
    .compose(spec)
  testRs.pipe(process.stdout)
})
