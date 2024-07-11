import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { maxSatisfying } from 'semver'
import { Client } from 'undici'

const npmRegistry = new Client('https://registry.npmjs.org', {})
export async function fetchPackageVersion (name: string, constraint: string = 'latest'): Promise<string> {
  const response = await npmRegistry.request({ method: 'GET', path: `/${name}` })
  if (response.statusCode !== 200) throw Error(`Cannot find package "${name}" from npm registry.`)
  const payload: any = await response.body.json()
  if (constraint === 'latest') {
    return payload['dist-tags'].latest
  }
  if (typeof constraint === 'string') {
    const versions = Object.keys(payload.versions)
    const version = maxSatisfying(versions, constraint)
    if (version) return version
  }
  throw Error(`"${name}" has no version match constraint "${constraint}"`)
}

export async function findPackageJSON (): Promise<{
  version: string
  dependencies: { [key: string]: string }
  devDependencies: { [key: string]: string }
}> {
  const pkg = JSON.parse(await readFile(resolve('package.json'), { encoding: 'utf8' }))
  return {
    version: pkg.version,
    dependencies: pkg.dependencies,
    devDependencies: pkg.devDependencies,
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
