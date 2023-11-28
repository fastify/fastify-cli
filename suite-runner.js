const { run } = require('node:test')
const { spec } = require('node:test/reporters')
const path = require('path')
const glob = require('glob')

const pattern = process.argv[process.argv.length - 1]

glob(pattern, (err, matches) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  const resolved = matches.map(file => path.resolve(file))
  run({ files: resolved })
    .compose(spec)
    .pipe(process.stdout)
})
