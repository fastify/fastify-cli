'use strict'

const {
  readFile,
  writeFile,
  existsSync
} = require('fs')
const path = require('path')
const chalk = require('chalk')
const generify = require('generify')
const argv = require('yargs-parser')
const cliPkg = require('./package')
const { execSync } = require('child_process')
const log = require('./log')

const javascriptTemplate = {
  dir: 'app',
  main: 'app.js',
  scripts: {
    test: 'tap "test/**/*.test.js"',
    start: 'fastify start -l info app.js',
    dev: 'fastify start -w -l info -P app.js'
  },
  dependencies: {
    fastify: cliPkg.dependencies.fastify,
    'fastify-plugin': cliPkg.devDependencies['fastify-plugin'] || cliPkg.dependencies['fastify-plugin'],
    '@fastify/autoload': cliPkg.devDependencies['@fastify/autoload'],
    '@fastify/sensible': cliPkg.devDependencies['@fastify/sensible'],
    'fastify-cli': '^' + cliPkg.version
  },
  devDependencies: {
    tap: cliPkg.devDependencies.tap
  },
  logInstructions: function (pkg) {
    log('debug', 'saved package.json')
    log('info', `project ${pkg.name} generated successfully`)
    log('debug', `run '${chalk.bold('npm install')}' to install the dependencies`)
    log('debug', `run '${chalk.bold('npm start')}' to start the application`)
    log('debug', `run '${chalk.bold('npm run dev')}' to start the application with pino-colada pretty logging (not suitable for production)`)
    log('debug', `run '${chalk.bold('npm test')}' to execute the unit tests`)

    if (pkg.scripts.lint) {
      log('debug', `run '${chalk.bold('npm lint')}' to run linter and fix code style issues`)
    }
  }
}

const typescriptTemplate = {
  dir: 'app-ts',
  main: 'app.ts',
  scripts: {
    test: 'npm run build:ts && tsc -p test/tsconfig.json && tap --ts "test/**/*.test.ts"',
    start: 'npm run build:ts && fastify start -l info dist/app.js',
    'build:ts': 'tsc',
    'watch:ts': 'tsc -w',
    dev: 'npm run build:ts && concurrently -k -p "[{name}]" -n "TypeScript,App" -c "yellow.bold,cyan.bold" "npm:watch:ts" "npm:dev:start"',
    'dev:start': 'fastify start --ignore-watch=.ts$ -w -l info -P dist/app.js'
  },
  dependencies: {
    fastify: cliPkg.dependencies.fastify,
    'fastify-plugin': cliPkg.devDependencies['fastify-plugin'] || cliPkg.dependencies['fastify-plugin'],
    '@fastify/autoload': cliPkg.devDependencies['@fastify/autoload'],
    '@fastify/sensible': cliPkg.devDependencies['@fastify/sensible'],
    'fastify-cli': '^' + cliPkg.version
  },
  devDependencies: {
    '@types/node': cliPkg.devDependencies['@types/node'],
    '@types/tap': cliPkg.devDependencies['@types/tap'],
    'ts-node': cliPkg.devDependencies['ts-node'],
    concurrently: cliPkg.devDependencies.concurrently,
    'fastify-tsconfig': cliPkg.devDependencies['fastify-tsconfig'],
    tap: cliPkg.devDependencies.tap,
    typescript: cliPkg.devDependencies.typescript
  },
  nodemonConfig: {
    watch: ['src/'],
    ignore: ['dist/*']
  },
  logInstructions: function (pkg) {
    log('debug', 'saved package.json')
    log('info', `project ${pkg.name} generated successfully`)
    log('debug', `run '${chalk.bold('npm install')}' to install the dependencies`)
    log('debug', `run '${chalk.bold('npm start')}' to start the application`)
    log('debug', `run '${chalk.bold('npm build:ts')}' to compile the typescript application`)
    log('debug', `run '${chalk.bold('npm run dev')}' to start the application with pino-colada pretty logging (not suitable for production)`)
    log('debug', `run '${chalk.bold('npm test')}' to execute the unit tests`)
  }
}

function generate (dir, template) {
  return new Promise((resolve, reject) => {
    generify(path.join(__dirname, 'templates', template.dir), dir, {}, function (file) {
      log('debug', `generated ${file}`)
    }, function (err) {
      if (err) {
        return reject(err)
      }

      process.chdir(dir)
      execSync('npm init -y')

      log('info', `reading package.json in ${dir}`)
      readFile('package.json', (err, data) => {
        if (err) {
          return reject(err)
        }

        let pkg
        try {
          pkg = JSON.parse(data)
        } catch (err) {
          return reject(err)
        }

        pkg.main = template.main

        pkg.type = template.type

        pkg.scripts = Object.assign(pkg.scripts || {}, template.scripts)

        pkg.dependencies = Object.assign(pkg.dependencies || {}, template.dependencies)

        pkg.devDependencies = Object.assign(pkg.devDependencies || {}, template.devDependencies)

        pkg.tap = template.tap

        log('debug', 'edited package.json, saving')
        writeFile('package.json', JSON.stringify(pkg, null, 2), (err) => {
          if (err) {
            return reject(err)
          }

          template.logInstructions(pkg)
          resolve()
        })
      })
    })
  })
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

  let template
  if (opts.lang === 'ts' || opts.lang === 'typescript') {
    template = typescriptTemplate
  } else {
    template = { ...javascriptTemplate }

    if (opts.esm) {
      template.dir = 'app-esm'
      template.type = 'module'
      template.tap = {
        'node-arg': [
          '--no-warnings',
          '--experimental-loader',
          '@istanbuljs/esm-loader-hook'
        ]
      }
      template.devDependencies['@istanbuljs/esm-loader-hook'] = cliPkg.devDependencies['@istanbuljs/esm-loader-hook']
    }

    if (opts.standardlint) {
      template.scripts = {
        ...template.scripts,
        pretest: 'standard',
        lint: 'standard --fix'
      }

      template.devDependencies = {
        ...template.devDependencies,
        standard: cliPkg.devDependencies.standard
      }
    }
  }

  generate(dir, template).catch(function (err) {
    if (err) {
      log('error', err.message)
      process.exit(1)
    }
  })
}

module.exports = {
  generate,
  cli,
  javascriptTemplate,
  typescriptTemplate
}

if (require.main === module) {
  cli(process.argv.slice(2))
}
