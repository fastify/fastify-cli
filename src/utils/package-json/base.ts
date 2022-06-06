import { resolve } from 'path'

export function findPackageJSON (): {
  version: string
  dependencies: { [key: string]: string }
  devDependencies: { [key: string]: string }
} {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pkg = require(resolve('package.json'))
  return {
    version: pkg.version,
    dependencies: pkg.dependencies,
    devDependencies: pkg.devDependencies
  }
}

export function sort (dependencies: { [key: string]: string }): { [key: string]: string } {
  const keys = Object.keys(dependencies).sort()
  const obj: { [key: string]: string } = {}
  for (const key of keys) {
    obj[key] = dependencies[key]
  }
  return obj
}
