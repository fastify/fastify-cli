const { run } = require('node:test')
const { spec } = require('node:test/reporters')
const path = require('path')
const glob = require('glob')

const pattern = process.argv[process.argv.length - 1]

console.info(`Running tests matching ${pattern}`)

glob(pattern, (err, matches) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  const resolved = matches.map(file => path.resolve(file))
  const testRs = run({ files: resolved }).compose(spec)
  testRs.pipe(process.stdout)
})
