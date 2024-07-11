import { fetchPackageVersion, findPackageJSON, sort } from './base.js'

export async function computePackageJSON (answer: any): Promise<string> {
  const pkg = await findPackageJSON()
  const template: any = {}
  template.name = answer.name
  template.main = answer.language === 'JavaScript' ? 'app.js' : 'dist/app.js'
  template.scripts = computeScripts(answer)
  template.dependencies = await computeDependencies(answer, pkg)
  template.devDependencies = await computeDevDependencies(answer, pkg)

  return JSON.stringify(template, null, 2)
}

export function computeScripts (answer: any): { [key: string]: string } {
  const scripts: any = {}
  // Lint Command
  if (answer.lint === 'standard') {
    scripts.lint = 'standard'
  }
  if (answer.lint === 'ts-standard') {
    scripts.lint = 'ts-standard'
  }
  if (String(answer.lint).includes('eslint')) {
    scripts.lint = 'eslint'
  }

  // Other Commands
  if (answer.language === 'JavaScript') {
    scripts.test = 'node --test "test/**/*.test.js"'
    scripts.start = 'fastify start info app.js'
    scripts.dev = 'fastify start -w info -P app.js'
  }
  if (answer.language === 'TypeScript') {
    scripts.test = 'node --test -r ts-node/register "test/**/*.test.ts"'
    scripts.start = 'fastify start -r ts-node/register app.js'
    scripts.dev = 'fastify start -r ts-node/register -w -P app.js'
  }
  return scripts
}

export async function computeDependencies (_answer: any, pkg: any): Promise<Record<string, string>> {
  const dependencies: any = {}
  dependencies['@fastify/autoload'] = await fetchPackageVersion('@fastify/autoload')
  dependencies['@fastify/sensible'] = await fetchPackageVersion('@fastify/sensible')
  dependencies.fastify = await fetchPackageVersion('fastify')
  dependencies['fastify-cli'] = pkg.version
  dependencies['fastify-plugin'] = await fetchPackageVersion('fastify-plugin')
  return sort(dependencies)
}

// ts-standard

export async function computeDevDependencies (answer: any, pkg: any): Promise<Record<string, string>> {
  const dependencies: any = {}
  if (answer.test === 'tap') {
    // See https://github.com/tapjs/tapjs/blob/main/src/docs/content/changelog.md#200
    dependencies['tap'] = await fetchPackageVersion('tap', '^20.0.0')
  }
  if (answer.language === 'TypeScript') {
    dependencies['@types/node'] = await fetchPackageVersion('@types/node')
    dependencies['ts-node'] = await fetchPackageVersion('ts-node')
    dependencies.typescript = await fetchPackageVersion('typescript', '~5.3.0')
  }
  if (answer.lint === 'eslint') {
    // ESLint breaking changes always breaks plugin
    // it requires a period of time before supporting
    // pinning to the major version helps in this situation
    dependencies.eslint = await fetchPackageVersion('eslint', '^9.0.0')
    dependencies['@eslint/js'] = await fetchPackageVersion('@eslint/js')
    dependencies['globals'] = await fetchPackageVersion('globals')
  }

  if (answer.lint === 'neostandard') {
    dependencies.eslint = await fetchPackageVersion('eslint', '^9.0.0')
    dependencies.neostandard = await fetchPackageVersion('neostandard')
  }

  return sort(dependencies)
}
