'use strict'

const {
  readFile,
  writeFile
} = require('fs').promises
const { existsSync } = require('fs')
const path = require('path')
const chalk = require('chalk')
const generify = require('generify')
const argv = require('yargs-parser')
const cliPkg = require('./package')
const { execSync } = require('child_process')
const { promisify } = require('util')
const log = require('./log')

const pluginTemplate = {
  dir: 'plugin',
  main: 'index.js',
  types: 'index.d.ts',
  scripts: {
    lint: 'standard && npm run lint:typescript',
    'lint:typescript': 'ts-standard',
    test: 'npm run lint && npm run unit && npm run test:typescript',
    'test:typescript': 'tsd',
    unit: 'tap "test/**/*.test.js"'
  },
  dependencies: {
    'fastify-plugin': cliPkg.devDependencies['fastify-plugin']
  },
  devDependencies: {
    '@types/node': cliPkg.devDependencies['@types/node'],
    fastify: cliPkg.devDependencies.fastify,
    'fastify-tsconfig': cliPkg.devDependencies['fastify-tsconfig'],
    standard: cliPkg.devDependencies.standard,
    tap: cliPkg.devDependencies.tap,
    'ts-standard': cliPkg.devDependencies['ts-standard'],
    tsd: cliPkg.devDependencies.tsd,
    typescript: cliPkg.devDependencies.typescript
  },
  tsd: {
    directory: 'test'
  },
  logInstructions: function (pkg) {
    log('debug', 'saved package.json')
    log('info', `project ${pkg.name} generated successfully`)
    log('debug', `run '${chalk.bold('npm install')}' to install the dependencies`)
    log('debug', `run '${chalk.bold('npm test')}' to execute the tests`)
  }
}

async function generate (dir, template) {
  const generifyPromise = promisify(generify)
  const file = await generifyPromise(
    path.join(__dirname, 'templates', template.dir),
    dir,
    {}
  )
  log('debug', `generated ${file}`)

  process.chdir(dir)
  execSync('npm init -y')

  log('info', `reading package.json in ${dir}`)

  const pkg = await readFile('package.json').then(JSON.parse)
  pkg.main = template.main
  pkg.types = template.types
  pkg.description = ''
  pkg.license = 'MIT'
  pkg.scripts = Object.assign(pkg.scripts || {}, template.scripts)
  pkg.dependencies = Object.assign(pkg.dependencies || {}, template.dependencies)
  pkg.devDependencies = Object.assign(pkg.devDependencies || {}, template.devDependencies)
  pkg.tsd = Object.assign(pkg.tsd || {}, template.tsd)

  log('debug', 'edited package.json, saving')

  await writeFile('package.json', JSON.stringify(pkg, null, 2))

  template.logInstructions(pkg)
}

function cli (args) {
  const opts = argv(args)
  const dir = opts._[0]

  if (dir && existsSync(dir)) {
    if (dir !== '.' && dir !== './') {
      log('error', 'directory ' + opts._[0] + ' already exists')
      process.exit(1)
    }
  }
  if (dir === undefined) {
    log('error', 'must specify a directory to \'fastify generate\'')
    process.exit(1)
  }
  if (!opts.integrate && existsSync(path.join(dir, 'package.json'))) {
    log('error', 'a package.json file already exists in target directory')
    process.exit(1)
  }

  generate(dir, pluginTemplate).catch(function (err) {
    if (err) {
      log('error', err.message)
      process.exit(1)
    }
  })
}

module.exports = {
  generate,
  cli,
  pluginTemplate
}

if (require.main === module) {
  cli(process.argv.slice(2))
}
