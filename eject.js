'use strict'

const path = require('node:path')
const fs = require('node:fs/promises')
const generify = require('generify')
const parseArgs = require('./lib/parse-args')
const log = require('./log')
const cliPkg = require('./package.json')

function normalize (source) {
  return source.replace(/\r\n/g, '\n').trimEnd()
}

async function readPackage (dir) {
  try {
    return JSON.parse(await fs.readFile(path.join(dir, 'package.json'), 'utf8'))
  } catch (err) {
    if (err.code === 'ENOENT') return null
    throw err
  }
}

function copyTemplate (dir, template) {
  return new Promise((resolve, reject) => {
    generify(path.join(__dirname, 'templates', template), dir, {}, function (file) {
      log('debug', `generated ${file}`)
    }, function (err) {
      if (err) return reject(err)
      resolve()
    })
  })
}

async function usesCli (dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') continue
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (await usesCli(file)) return true
    } else if (entry.isFile() && /\.[cm]?[jt]sx?$/.test(entry.name)) {
      if ((await fs.readFile(file, 'utf8')).includes('fastify-cli')) return true
    }
  }
  return false
}

async function eject (dir, template) {
  const pkg = await readPackage(dir)
  const typescript = template === 'eject-ts' || template === 'eject-ts-esm'
  const esm = template === 'eject-esm' || template === 'eject-ts-esm'
  const appTemplate = `app${typescript ? '-ts' : ''}${esm ? '-esm' : ''}`
  const helperName = `helper.${typescript ? 'ts' : 'js'}`
  const helperPath = path.join(dir, 'test', helperName)
  let replaceHelper = false

  if (pkg) {
    try {
      const existing = await fs.readFile(helperPath, 'utf8')
      const generated = await fs.readFile(path.join(__dirname, 'templates', appTemplate, 'test', helperName), 'utf8')
      replaceHelper = normalize(existing) === normalize(generated)
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
    }
  }

  const serverName = typescript ? path.join('src', 'server.ts') : 'server.js'
  try {
    const existing = await fs.readFile(path.join(dir, serverName), 'utf8')
    const generated = await fs.readFile(path.join(__dirname, 'templates', template, serverName), 'utf8')
    if (normalize(existing) !== normalize(generated)) {
      throw new Error(`${serverName} already exists and has been customized; move it before ejecting`)
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err
  }

  // Validate the manifest and existing server before generating any files.
  await copyTemplate(dir, template)
  if (!pkg) return

  if (replaceHelper) {
    await fs.copyFile(path.join(__dirname, 'templates', `${template}-helper`, helperName), helperPath)
  }

  pkg.scripts ||= {}
  const replacements = typescript
    ? {
        start: ['npm run build:ts && fastify start -l info dist/app.js', 'npm run build:ts && node dist/server.js'],
        'dev:start': ['fastify start --ignore-watch=.ts$ -w -l info -P dist/app.js', 'node --watch dist/server.js'],
        dev: ['fastify start -w -l info src/app.ts', 'npm run build:ts && concurrently -k -p "[{name}]" -n "TypeScript,App" -c "yellow.bold,cyan.bold" "npm:watch:ts" "npm:dev:start"']
      }
    : {
        start: ['fastify start -l info app.js', 'node server.js'],
        dev: ['fastify start -w -l info -P app.js', 'node --watch server.js']
      }

  for (const [name, [before, after]] of Object.entries(replacements)) {
    if (pkg.scripts[name] === before || (name === 'start' && pkg.scripts[name] === undefined) || (!typescript && name === 'dev' && pkg.scripts[name] === undefined)) {
      pkg.scripts[name] = after
      if (typescript && name === 'dev') pkg.scripts['dev:start'] ||= 'node --watch dist/server.js'
    }
  }

  if (typescript) {
    const appConfig = path.join(dir, 'tsconfig.json')
    try {
      const existing = await fs.readFile(appConfig, 'utf8')
      const generated = await fs.readFile(path.join(__dirname, 'templates', appTemplate, 'tsconfig.json'), 'utf8')
      if (normalize(existing) === normalize(generated)) {
        const config = JSON.parse(existing)
        config.compilerOptions.rootDir = 'src'
        config.compilerOptions.skipLibCheck ??= true
        await fs.writeFile(appConfig, JSON.stringify(config, null, 2) + '\n')
      }
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
    }
    const testConfig = path.join(dir, 'test', 'tsconfig.json')
    try {
      const existing = await fs.readFile(testConfig, 'utf8')
      const generated = await fs.readFile(path.join(__dirname, 'templates', appTemplate, 'test', 'tsconfig.json'), 'utf8')
      const testScript = esm
        ? 'npm run build:ts && tsc -p test/tsconfig.json && FASTIFY_AUTOLOAD_TYPESCRIPT=1 node --test --experimental-test-coverage --loader ts-node/esm test/**/*.ts'
        : 'npm run build:ts && tsc -p test/tsconfig.json && c8 node --test -r ts-node/register "test/**/*.ts"'
      if (normalize(existing) === normalize(generated) && pkg.scripts.test === testScript) {
        await fs.copyFile(path.join(__dirname, 'templates', `${template}-helper`, 'tsconfig.json'), testConfig)
        pkg.scripts.test = `npm run build:ts && tsc -p test/tsconfig.json && ${esm ? 'node --test --experimental-test-coverage' : 'c8 node --test'} "dist/test/**/*.test.js"`
      }
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
    }
  }

  pkg.dependencies ||= {}
  if (!pkg.dependencies['close-with-grace']) {
    pkg.dependencies['close-with-grace'] = pkg.devDependencies?.['close-with-grace'] || cliPkg.dependencies['close-with-grace']
    if (pkg.devDependencies) delete pkg.devDependencies['close-with-grace']
  }

  const cliScripts = Object.values(pkg.scripts).some(script => /\bfastify\b/.test(script))
  if (!cliScripts && !await usesCli(dir)) {
    delete pkg.dependencies['fastify-cli']
    if (pkg.devDependencies) delete pkg.devDependencies['fastify-cli']
  } else {
    log('info', 'keeping fastify-cli: custom scripts or source files still use it')
  }
  await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n')
  log('info', 'ejected application; run your package manager install command to update dependencies and the lockfile')
}

async function cli (args) {
  try {
    const opts = parseArgs(args, {
      options: {
        lang: { type: 'string' },
        esm: { type: 'boolean' }
      }
    })
    const dir = process.cwd()
    const pkg = await readPackage(dir)
    const esm = opts.esm === undefined ? pkg?.type === 'module' : opts.esm
    let typescript = opts.lang === 'ts' || opts.lang === 'typescript'
    if (opts.lang === undefined) {
      try {
        await fs.access(path.join(dir, 'src', 'app.ts'))
        typescript = true
      } catch (err) {
        if (err.code !== 'ENOENT') throw err
      }
    }
    await eject(dir, `eject${typescript ? '-ts' : ''}${esm ? '-esm' : ''}`)
  } catch (err) {
    log('error', err.message)
    process.exit(1)
  }
}

module.exports = {
  eject,
  cli
}

if (require.main === module) {
  cli(process.argv.slice(2))
}
