import { findPackageJSON, sort } from './base'

export function computePackageJSON (answer: any): string {
  const pkg = findPackageJSON()
  const template: any = {}
  template.name = answer.name
  template.main = 'index.js'
  template.scripts = computeScripts(answer)
  template.dependencies = computeDependencies(answer, pkg)
  template.devDependencies = computeDevDependencies(answer, pkg)
  if (String(answer.lint).includes('eslint')) {
    template.eslintConfig = computeESLintConfig(template.devDependencies)
  }
  template.tsd = computeTSDConfig()

  return JSON.stringify(template, null, 2)
}

export function computeScripts (answer: any): { [key: string]: string } {
  const scripts: any = {}
  // Lint Command
  if (answer.lint === 'standard') {
    scripts.lint = 'standard'
  }
  if (String(answer.lint).includes('eslint')) {
    scripts.lint = 'eslint .'
  }

  // Other Commands
  if (answer.language === 'JavaScript') {
    scripts.test = 'npm run unit && npm run tsd'
    scripts.unit = 'tap "test/**/*.test.js"'
    scripts.tsd = 'tsd'
  }
  return scripts
}

export function computeDependencies (_answer: any, pkg: any): { [key: string]: string } {
  const dependencies: any = {}
  dependencies['fastify-plugin'] = pkg.dependencies['fastify-plugin']
  return sort(dependencies)
}

export function computeDevDependencies (answer: any, pkg: any): { [key: string]: string } {
  const dependencies: any = {}
  dependencies.tap = pkg.devDependencies.tap
  dependencies.tsd = pkg.devDependencies.tsd
  dependencies.fastify = pkg.dependencies.fastify

  if (String(answer.lint).includes('eslint')) {
    // shared
    dependencies.eslint = '^8.16.0'
    dependencies['eslint-plugin-import'] = pkg.devDependencies['eslint-plugin-import']
    dependencies['eslint-plugin-promise'] = '^6.0.0'

    // standard
    if (String(answer.lint).includes('standard')) {
      dependencies['eslint-config-standard'] = '^17.0.0'
      dependencies['eslint-plugin-n'] = '^15.2.0'
    }
  }
  if (answer.lint === 'standard') {
    dependencies.standard = '^17.0.0'
  }

  return sort(dependencies)
}

export function computeESLintConfig (devDependencies: { [key: string]: string }): any {
  const keys = Object.keys(devDependencies)
  // standard
  if (keys.includes('eslint-config-standard')) {
    return {
      extends: 'standard'
    }
  }
  // eslint
  const config: {
    extends: string[]
    plugins: string[]
    [key: string]: any
  } = {
    extends: ['eslint:recommended'],
    plugins: []
  }
  if (keys.includes('eslint-plugin-promise')) {
    config.plugins.push('promise')
  }
  if (keys.includes('eslint-plugin-import')) {
    config.extends.push('plugin:import/recommended')
    config.plugins.push('import')
  }
  if (keys.includes('eslint-plugin-n')) {
    config.extends.push('plugin:n/recommended')
  }
  return config
}

export function computeTSDConfig (): any {
  return {
    directory: 'test'
  }
}
