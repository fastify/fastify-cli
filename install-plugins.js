'use strict'

const argv = require('yargs-parser')
const { existsSync } = require('node:fs')
const { join } = require('node:path')
const log = require('./log')
const { prompt } = require('inquirer')
const { readFile, writeFile } = require('node:fs/promises')
const cliPkg = require('./package')
const chalk = require('chalk')

const kTopics ='topics'

const corePlugins = {
  'authentication/authorization': {
    [kTopics]: [
      "auth",
      "jwt",
      "session",
      "passport",
      "authentication",
      "authorization"
    ],
    '@fastify/basic-auth': '@fastify/basic-auth: Basic auth plugin for Fastify. See https://github.com/fastify/fastify-basic-auth for more.',
    '@fastify/bearer-auth': '@fastify/bearer-auth: Bearer auth plugin for Fastify. See https://github.com/fastify/fastify-bearer-auth for more.',
    '@fastify/auth': '@fastify/auth: Run multiple auth functions in Fastify. See https://github.com/fastify/fastify-auth for more.',
    '@fastify/jwt': '@fastify/jwt: JWT utils for Fastify, internally uses fast-jwt. See https://github.com/fastify/fastify-jwt for more.',
    '@fastify/oauth2': '@fastify/oauth2: Wrap around simple-oauth2. See https://github.com/fastify/fastify-oauth2 for more.',
    '@fastify/passport': '@fastify/passport: Use Passport strategies to authenticate requests and protect route. See https://github.com/fastify/fastify-passport for more.',
    '@fastify/secure-session': '@fastify/secure-session: Create a secure stateless cookie session for Fastify. See https://github.com/fastify/fastify-secure-session for more.',
    '@fastify/session': '@fastify/session: a session plugin for Fastify. See https://github.com/fastify/session for more.'
  },
  security: {
    [kTopics]: [
      "security",
      "helmet",
      "rate-limit",
      "csrf"
    ],
    '@fastify/csrf-protection': '@fastify/csrf-protection: A plugin for adding [CSRF](https://en.wikipedia.org/wiki/Cross-site_request_forgery) protection to Fastify. See https://github.com/fastify/csrf-protection for more.',
    '@fastify/helmet': '@fastify/helmet: Important security headers for Fastify. See https://github.com/fastify/fastify-helmet for more.',
    '@fastify/rate-limit': '@fastify/rate-limit: A low overhead rate limiter for your routes. See https://github.com/fastify/fastify-rate-limit for more.',
    '@fastify/cors': '@fastify/cors: Enables the use of CORS in a Fastify application. See https://github.com/fastify/fastify-cors for more.',
  },
  'database connection': {
    [kTopics]: [
      "sql",
      "db",
      "database",
      "nosql"
    ],
    '@fastify/mongodb': '@fastify/mongodb: Fastify MongoDB connection plugin, with which you can share the same MongoDB connection pool across every part of your server. See https://github.com/fastify/fastify-mongodb for more.',
    '@fastify/leveldb': '@fastify/leveldb: Plugin to share a common LevelDB connection across Fastify. See https://github.com/fastify/fastify-leveldb for more.',
    '@fastify/elasticsearch': '@fastify/elasticsearch: Plugin to share the same ES client. See https://github.com/fastify/fastify-elasticsearch for more.',
    '@fastify/kafka': '@fastify/kafka: Plugin to interact with Apache Kafka. See https://github.com/fastify/fastify-kafka for more.',
    '@fastify/mysql': '@fastify/mysql: Fastify MySQL connection plugin. See https://github.com/fastify/fastify-mysql for more.',
    '@fastify/postgres': '@fastify/postgres: Fastify PostgreSQL connection plugin, with this you can share the same PostgreSQL connection pool in every part of your server. See https://github.com/fastify/fastify-postgres for more.',
    '@fastify/redis': '@fastify/redis: Fastify Redis connection plugin, with which you can share the same Redis connection across every part of your server. See https://github.com/fastify/fastify-redis for more.'
  },
  'HTTP utility': {
    [kTopics]: [
      "http",
      "caching",
      "etag",
      "compress",
      "proxy",
      "forward"
    ],
    '@fastify/accepts': '@fastify/accepts: to have accepts in your request object. See https://github.com/fastify/fastify-accepts for more.',
    '@fastify/accepts-serializer': '@fastify/accepts-serializer: to serialize to output according to the Accept header. See https://github.com/fastify/fastify-accepts-serializer for more.',
    '@fastify/caching': '@fastify/caching: General server-side cache and ETag support. See https://github.com/fastify/fastify-caching for more.',
    '@fastify/circuit-breaker': '@fastify/circuit-breaker: A low overhead circuit breaker for your routes. See https://github.com/fastify/fastify-circuit-breaker for more.',
    '@fastify/compress': '@fastify/compress: Fastify compression utils. See https://github.com/fastify/fastify-compress for more.',
    '@fastify/cookie': '@fastify/cookie: Parse and set cookie headers. See https://github.com/fastify/fastify-cookie for more.',
    '@fastify/early-hints': '@fastify/early-hints: Plugin to add HTTP 103 feature based on RFC 8297. See https://github.com/fastify/fastify-early-hints for more.',
    '@fastify/etag': '@fastify/etag: Automatically generate ETags for HTTP responses. See https://github.com/fastify/fastify-etag for more.',
    '@fastify/flash': '@fastify/flash: Set and get flash messages using the session. See https://github.com/fastify/fastify-flash for more.',
    '@fastify/formbody': '@fastify/formbody: Plugin to parse x-www-form-urlencoded bodies. See https://github.com/fastify/fastify-formbody for more.',
    '@fastify/http-proxy': '@fastify/http-proxy: Proxy your HTTP requests to another server, with hooks. See https://github.com/fastify/fastify-http-proxy for more.',
    '@fastify/multipart': '@fastify/multipart: Multipart support for Fastify. See https://github.com/fastify/fastify-multipart for more.',
    '@fastify/reply-from': '@fastify/reply-from: Plugin to forward the current HTTP request to another server. See https://github.com/fastify/fastify-reply-from for more.',
    '@fastify/sensible': '@fastify/sensible: Defaults for Fastify that everyone can agree on. It adds some useful decorators such as HTTP errors and assertions, but also more request and reply methods. See https://github.com/fastify/fastify-sensible for more.'
  },
  utilities: {
    '@fastify/any-schema': '@fastify/any-schema: Save multiple schemas and decide which one to use to serialize the payload See https://github.com/fastify/any-schema-you-like for more.',
    '@fastify/autoload': '@fastify/autoload: Require all plugins in a directory. See https://github.com/fastify/fastify-autoload for more.',
    '@fastify/awilix': '@fastify/awilix: Dependency injection support for Fastify, based on awilix. See https://github.com/fastify/fastify-awilix for more.',
    '@fastify/diagnostics-channel': '@fastify/diagnostics-channel: Plugin to deal with diagnostics_channel on Fastify See https://github.com/fastify/fastify-diagnostics-channel for more.',
    '@fastify/env': '@fastify/env: Load and check configuration. See https://github.com/fastify/fastify-env for more.',
    '@fastify/funky': '@fastify/funky: Makes functional programming in Fastify more convenient. Adds support for Fastify routes returning functional structures, such as Either, Task or plain parameterless function. See https://github.com/fastify/fastify-funky for more.',
    '@fastify/hotwire': '@fastify/hotwire: Use the Hotwire pattern with Fastify. See https://github.com/fastify/fastify-hotwire for more.',
    '@fastify/nextjs': '@fastify/nextjs: React server-side rendering support for Fastify with [Next](https://github.com/zeit/next.js/). See https://github.com/fastify/fastify-nextjs for more.',
    '@fastify/one-line-logger': '@fastify/one-line-logger: Formats Fastify\'s logs into a nice one-line message. See https://github.com/fastify/one-line-logger for more.',
    '@fastify/request-context': '@fastify/request-context: Request-scoped storage, based on AsyncLocalStorage (with fallback to cls-hooked), providing functionality similar to thread-local storages. See https://github.com/fastify/fastify-request-context for more.',
    '@fastify/response-validation': '@fastify/response-validation: A simple plugin that enables response validation for Fastify. See https://github.com/fastify/fastify-response-validation for more.',
    '@fastify/routes': '@fastify/routes: Plugin that provides a Map of routes. See https://github.com/fastify/fastify-routes for more.',
    '@fastify/routes-stats': '@fastify/routes-stats: Provide stats for routes using node:perf_hooks. See https://github.com/fastify/fastify-routes-stats for more.',
    '@fastify/schedule': '@fastify/schedule: Plugin for scheduling periodic jobs, based on [toad-scheduler](https://github.com/kibertoad/toad-scheduler). See https://github.com/fastify/fastify-schedule for more.',
    '@fastify/soap-client': '@fastify/soap-client: a SOAP client plugin for Fastify. See https://github.com/fastify/fastify-soap-client for more.',
    '@fastify/static': '@fastify/static: Plugin for serving static files as fast as possible. See https://github.com/fastify/fastify-static for more.',
    '@fastify/swagger': '@fastify/swagger: Plugin for serving Swagger/OpenAPI documentation for Fastify, supporting dynamic generation. See https://github.com/fastify/fastify-swagger for more.',
    '@fastify/swagger-ui': '@fastify/swagger-ui: Plugin for serving Swagger UI. See https://github.com/fastify/fastify-swagger-ui for more.',
    '@fastify/throttle': '@fastify/throttle: Plugin for throttling the download speed of a request. See https://github.com/fastify/fastify-throttle for more.',
    '@fastify/under-pressure': '@fastify/under-pressure: Measure process load with automatic handling of _"Service Unavailable"_ plugin for Fastify. See https://github.com/fastify/under-pressure for more.',
    '@fastify/url-data': '@fastify/url-data: Decorate the Request object with a method to access raw URL components. See https://github.com/fastify/fastify-url-data for more.',
    '@fastify/view': '@fastify/view: Templates rendering (ejs, pug, handlebars, marko) plugin support for Fastify. See https://github.com/fastify/point-of-view for more.',
    '@fastify/vite': '@fastify/vite: Integration with Vite, allows for serving SPA/MPA/SSR Vite applications. See https://github.com/fastify/fastify-vite for more.',
    '@fastify/websocket': '@fastify/websocket: WebSocket support for Fastify. Built upon ws. See https://github.com/fastify/fastify-websocket for more.'
  },
  serverless: {
    [kTopics]: [
      "aws",
      "serverless"
    ],
    '@fastify/aws-lambda': '@fastify/aws-lambda: allows you to easily build serverless web applications/services and RESTful APIs using Fastify on top of AWS Lambda and Amazon API Gateway. See https://github.com/fastify/aws-lambda-fastify for more.'
  },
  compatibility: {
    [kTopics]: [
      "compatibility",
      "express"
    ],
    '@fastify/middie': '@fastify/middie: Middleware engine for Fastify. See https://github.com/fastify/middie for more.',
    '@fastify/express': '@fastify/express: Express compatibility layer for Fastify. See https://github.com/fastify/fastify-express for more.'
  },
  TypeScript: {
    [kTopics]: [
      "types",
      "typescript"
    ],
    '@fastify/type-provider-json-schema-to-ts': '@fastify/type-provider-json-schema-to-ts: Fastify type provider for json-schema-to-ts. See https://github.com/fastify/fastify-type-provider-json-schema-to-ts for more.',
    '@fastify/type-provider-typebox': '@fastify/type-provider-typebox: Fastify type provider for Typebox. See https://github.com/fastify/fastify-type-provider-typebox for more.'
  }
}

const categories = Object.keys(corePlugins)

async function generate (dir, plugins) {
  process.chdir(dir)

  const raw = await readFile('package.json', 'utf8')
  const pkg = JSON.parse(raw)

  const dependencies = {}
  for (const p of plugins) {
    dependencies[p] = cliPkg.devDependencies[p]
  }

  pkg.dependencies = Object.assign(pkg.dependencies || {}, dependencies)

  log('debug', 'updated package.json, saving')

  await writeFile('package.json', JSON.stringify(pkg, null, 2))

  log('debug', `run '${chalk.bold('npm install')}' to install the dependencies`)
}

async function cli (args) {
  const opts = argv(args)
  const dir = opts._[0] || '.'
  const searchFor = opts.s || opts.search

  if (!existsSync(join(dir, 'package.json'))) {
    log('error', 'a package.json file must already exist')
    process.exit(1)
  }

  const pluginsToBeInstalled = []

  if (searchFor) {
    log('info', `Search for plugins that match '${searchFor}'...`)

    const includePaths = []

    for(const category of categories) {
      if (corePlugins[category][kTopics]?.some(topic => topic.includes(searchFor))) {
        for(const [name, _] of Object.entries(corePlugins[category])) {
          if (name !== kTopics) {
            includePaths.push([category, name])
          }
        }
      } else {
        for(const [name, desc] of Object.entries(corePlugins[category])) {
          if (desc.includes(searchFor) && name !== kTopics) {
            includePaths.push([category, name])
          }
        }
      }
    }

    if (includePaths.length === 0) {
      log('info', `No plugins were found.`)
    } else {
      const res = await prompt({
        type: 'checkbox',
        message: 'Select plugins',
        name: 'plugins',
        choices: includePaths.map(([category, name]) => { return { name: corePlugins[category][name], value: name } })
      })

      pluginsToBeInstalled.push(...res.plugins)
    }

  } else {
    for (const category of categories) {
      const res1 = await prompt({ message: `Install ${category} plugins?`, type: 'confirm', name: 'answer' })

      if (res1.answer) {
        const res2 = await prompt({
          type: 'checkbox',
          message: 'Select plugins',
          name: 'plugins',
          choices: Object.entries(corePlugins[category]).filter(([name, _]) => name !== kTopics).map(([name, desc]) => { return { name: desc, value: name } })
        })

        pluginsToBeInstalled.push(...res2.plugins)
      }
    }
  }

  if (pluginsToBeInstalled.length > 0) {
    const res = await prompt({
      type: 'confirm',
      name: 'answer',
      message: `Should ${pluginsToBeInstalled.join(', ')} be added as dependencies in '${join(dir, 'package.json')}'?`
    })

    if (res.answer) {
      await generate(dir, pluginsToBeInstalled)
    } else {
      log('info', 'No plugins will be added.')
    }
  } else {
    log('info', 'No plugins will be installed.')
  }
}

module.exports = {
  generate,
  cli
}

if (require.main === module) {
  cli(process.argv.slice(2))
}
