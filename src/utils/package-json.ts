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

export function computePackageJSON (answer: any): string {
  const pkg = findPackageJSON()
  const template: any = {}
  template.name = answer.name
  template.main = answer.language === 'JavaScript' ? 'app.js' : 'dist/app.js'
  template.scripts = computeScripts(answer)
  template.dependencies = computeDependencies(answer, pkg)
  template.devDependencies = computeDevDependencies(answer, pkg)
  if (String(answer.lint).includes('eslint')) {
    template.eslintConfig = computeESLintConfig(template.devDependencies)
  }

  return JSON.stringify(template, null, 2)
}

function sort (dependencies: { [key: string]: string }): { [key: string]: string } {
  const keys = Object.keys(dependencies).sort()
  const obj: { [key: string]: string } = {}
  for (const key of keys) {
    obj[key] = dependencies[key]
  }
  return obj
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
    scripts.lint = `eslint . ${answer.language === 'TypeScript' ? '--ext .ts' : ''}`
  }

  // Other Commands
  if (answer.language === 'JavaScript') {
    scripts.test = 'tap "test/**/*.test.js"'
    scripts.start = 'fastify start -l info app.js'
    scripts.dev = 'fastify start -w -l info -P app.js'
  }
  if (answer.language === 'TypeScript') {
    scripts.test = 'tap "test/**/*.test.ts" --ts'
    scripts.start = 'fastify start -r ts-node/register -l info app.js'
    scripts.dev = 'fastify start -r ts-node/register -w -l info -P app.js'
  }
  return scripts
}

export function computeDependencies (_answer: any, pkg: any): { [key: string]: string } {
  const dependencies: any = {}
  dependencies['@fastify/autoload'] = pkg.dependencies['@fastify/autoload']
  dependencies['@fastify/sensible'] = pkg.dependencies['@fastify/sensible']
  dependencies.fastify = pkg.dependencies.fastify
  dependencies['fastify-cli'] = pkg.version
  dependencies['fastify-plugin'] = pkg.dependencies['fastify-plugin']
  return sort(dependencies)
}

// ts-standard

export function computeDevDependencies (answer: any, pkg: any): { [key: string]: string } {
  const dependencies: any = {}
  dependencies.tap = pkg.devDependencies.tap
  if (answer.language === 'TypeScript') {
    dependencies['@types/tap'] = pkg.devDependencies['@types/tap']
    dependencies['@types/node'] = pkg.devDependencies['@types/node']
    dependencies['ts-node'] = pkg.devDependencies['ts-node']
    dependencies.typescript = pkg.devDependencies.typescript
  }
  if (String(answer.lint).includes('eslint')) {
    // shared
    dependencies.eslint = '^8.16.0'
    dependencies['eslint-plugin-import'] = pkg.devDependencies['eslint-plugin-import']
    dependencies['eslint-plugin-promise'] = pkg.devDependencies['eslint-plugin-promise']

    // ts-standard
    if (String(answer.lint).includes('ts-standard')) {
      dependencies.eslint = pkg.devDependencies.eslint
      dependencies['eslint-plugin-node'] = pkg.devDependencies['eslint-plugin-node']
      dependencies['eslint-config-standard-with-typescript'] = pkg.devDependencies['eslint-config-standard-with-typescript']
      // require >=3.3.1 <4.5.0
      dependencies.typescript = '~4.4.0'
    } else
    // standard
    if (String(answer.lint).includes('standard')) {
      dependencies['eslint-config-standard'] = '^17.0.0'
    }

    // non ts-standard
    if (!String(answer.lint).includes('ts-standard')) {
      // eslint, eslint + standard
      // override version
      dependencies['eslint-plugin-promise'] = '^6.0.0'
      // eslint, eslint + standard
      dependencies['eslint-plugin-n'] = '^15.2.0'
    }

    // TypeScript
    if (answer.language === 'TypeScript') {
      dependencies['@typescript-eslint/eslint-plugin'] = pkg.devDependencies['@typescript-eslint/eslint-plugin']
      if (!String(answer.lint).includes('ts-standard')) {
        dependencies['@typescript-eslint/parser'] = '^5.25.0'
      }
    }
  }
  if (answer.lint === 'standard') {
    dependencies.standard = '^17.0.0'
  }
  if (answer.lint === 'ts-standard') {
    dependencies['ts-standard'] = '^11.0.0'
  }

  return sort(dependencies)
}

export function computeESLintConfig (devDependencies: { [key: string]: string }): any {
  const keys = Object.keys(devDependencies)
  // ts-standard
  if (keys.includes('eslint-config-standard-with-typescript')) {
    return {
      extends: 'standard-with-typescript',
      parserOptions: {
        project: './tsconfig.json'
      },
      overrides: [
        {
          files: [
            'test/**/*.test.ts'
          ],
          rules: {
            '@typescript-eslint/no-floating-promises': 'off'
          }
        }
      ]
    }
  }
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
  if (keys.includes('eslint-plugin-node')) {
    config.extends.push('plugin:node/recommended')
  }
  if (keys.includes('@typescript-eslint/eslint-plugin')) {
    config.plugins.push('@typescript-eslint')
    config.extends.push('plugin:@typescript-eslint/recommended')
  }
  if (keys.includes('@typescript-eslint/parser')) {
    config.parser = '@typescript-eslint/parser'
  }
  return config
}
