const nodeMajorVersion = process.versions.node.split('.').map(x => parseInt(x, 10))[0]
const shouldRunSuites = nodeMajorVersion >= 20
if (!shouldRunSuites) {
  console.info(`Skipped templates test suites on node ${nodeMajorVersion}`)
  process.exit(0)
}
process.exit(1)
