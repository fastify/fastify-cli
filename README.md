# fastify-cli

![CI](https://github.com/fastify/fastify-cli/workflows/CI/badge.svg)
[![NPM version](https://img.shields.io/npm/v/fastify-cli.svg?style=flat)](https://www.npmjs.com/package/fastify-cli)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://standardjs.com/)

Command line tools for [Fastify](https://github.com/fastify/fastify).
Generate, write, and run an application with one single command!

## Install
```bash
npm install fastify-cli --global
```

## Usage

`fastify-cli` offers a single command line interface for your Fastify
project:

```bash
$ fastify
```

Will print an help:

```
Fastify command line interface, available commands are:

  * start                 start a server
  * eject                 turns your application into a standalone executable with a server.(js|ts) file being added
  * generate              generate a new project
  * generate-plugin       generate a new plugin project
  * generate-swagger      generate Swagger/OpenAPI schema for a project using @fastify/swagger
  * readme                generate a README.md for the plugin
  * print-routes          prints the representation of the internal radix tree used by the router, useful for debugging.
  * version               the current fastify-cli version
  * help                  help about commands

Launch 'fastify help [command]' to know more about the commands.

The default command is start, you can hit

  fastify start plugin.js

to start plugin.js.
```

### start

You can start any Fastify plugin with:

```bash
$ fastify start plugin.js
```

A plugin can be as simple as:

```js
// plugin.js
module.exports = function (fastify, options, next) {
  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })
  next()
}
```

If you are using Node 8+, you can use `Promises` or `async` functions too:

```js
// async-await-plugin.js
module.exports = async function (fastify, options) {
  fastify.get('/', async function (req, reply) {
    return { hello: 'world' }
  })
}
```

For a list of available flags for `fastify start` see the help: `fastify help start`.

If you want to use custom options for the server creation, just export an options object with your route and run the cli command with the `--options` flag.

```js
// plugin.js
module.exports = function (fastify, options, next) {
  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })
  next()
}

module.exports.options = {
  https: {
    key: 'key',
    cert: 'cert'
  }
}
```

And if you are using EcmaScript Module format:

```javascript
export default async function plugin (fastify, options) {
  // Both `/foo` and `/foo/` are registered
  fastify.get('/foo/', async function (req, reply) {
    return 'foo'
  })
}

export const options = {
  ignoreTrailingSlash: true
}
```

If you want to use custom options for your plugin, just add them after the `--` terminator.

```js
// plugin.js
module.exports = function (fastify, options, next) {
  if (option.one) {
    //...
  }
  //...
  next()
}
```

```bash
$ fastify start plugin.js -- --one
```

Modules in EcmaScript Module format can be used on Node.js >= 14 or >= 12.17.0 but < 13.0.0'
```js
// plugin.js
export default async function plugin (fastify, options) {
  fastify.get('/', async function (req, reply) {
    return options
  })
}
```

This works with a `.js` extension if you are using Node.js >= 14 and the nearest parent `package.json` has `"type": "module"`
([more info here](https://nodejs.medium.com/announcing-core-node-js-support-for-ecmascript-modules-c5d6dc29b663)).
If your `package.json` does not have `"type": "module"`, use `.mjs` for the extension (`plugin.mjs` in the above example).

#### Options
You can pass the following options via CLI arguments. You can also use `--config` or `-c` flag to pass a configuration file that exports all the properties listed below in camelCase convention. In case of collision (i.e., An argument existing in both the configuration file and as a command-line argument, the command-line argument is given the priority). Every option has a corresponding environment variable:

| Description                                                                                                                             | Short command | Full command       | Environment variable     |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------ | ------------------------ |
| Path to configuration file that can be used to manage the options listed below                                                                                                   | `-c`          | `--config`           | `FASTIFY_CONFIG or CONFIG`   |
| Port to listen on (default to 3000)                                                                                                     | `-p`          | `--port`           | `FASTIFY_PORT or PORT`   |
| Address to listen on                                                                                                                    | `-a`          | `--address`        | `FASTIFY_ADDRESS`        |
| Socket to listen on                                                                                                                     | `-s`          | `--socket`         | `FASTIFY_SOCKET`         |
| Module to preload                                                                                                                       | `-r`          | `--require`        | `FASTIFY_REQUIRE`        |
| Log level (default to fatal)                                                                                                            | `-l`          | `--log-level`      | `FASTIFY_LOG_LEVEL`      |
| Path to logging configuration module to use                                                                                             | `-L`          | `--logging-module`  | `FASTIFY_LOGGING_MODULE` |
| Start Fastify app in debug mode with nodejs inspector                                                                                   | `-d`          | `--debug`          | `FASTIFY_DEBUG`          |
| Set the inspector port (default: 9320)                                                                                                  | `-I`          | `--debug-port`     | `FASTIFY_DEBUG_PORT`     |
| Set the inspector host to listen on (default: loopback address or `0.0.0.0` inside Docker)                                              |               | `--debug-host`     | `FASTIFY_DEBUG_HOST`     |
| Prints pretty logs                                                                                                                      | `-P`          | `--pretty-logs`    | `FASTIFY_PRETTY_LOGS`    |
| Watch process.cwd() directory for changes, recursively; when that happens, the process will auto reload                                 | `-w`          | `--watch`          | `FASTIFY_WATCH`          |
| Ignore changes to the specified files or directories when watch is enabled. (e.g. `--ignore-watch='node_modules .git logs/error.log'` ) |               | `--ignore-watch`   | `FASTIFY_IGNORE_WATCH`   |
| Prints events triggered by watch listener (useful to debug unexpected reload when using `--watch` )                                     |     `-V`          | `--verbose-watch`  | `FASTIFY_VERBOSE_WATCH`   |
| Use custom options                                                                                                                      | `-o`          | `--options`        | `FASTIFY_OPTIONS`        |
| Set the prefix                                                                                                                          | `-x`          | `--prefix`         | `FASTIFY_PREFIX`         |
| Set the plugin timeout                                                                                                                  | `-T`          | `--plugin-timeout` | `FASTIFY_PLUGIN_TIMEOUT` |
| Defines the maximum payload, in bytes,<br>that the server is allowed to accept                                                               |               | `--body-limit`     | `FASTIFY_BODY_LIMIT`     |
| Set the maximum ms delay before forcefully closing pending requests after receiving SIGTERM or SIGINT signals; and uncaughtException or unhandledRejection errors (default: 500)                                                           | `-g`         | `--close-grace-delay`     | `FASTIFY_CLOSE_GRACE_DELAY`     |

By default `fastify-cli` runs [`dotenv`](https://www.npmjs.com/package/dotenv), so it will load all the env variables stored in `.env` in your current working directory.

The default value for `--plugin-timeout` is 10 seconds.
By default `--ignore-watch` flag is set to ignore `node_modules build dist .git bower_components logs .swp' files.

#### Containerization

When deploying to a Docker, and potentially other, containers, it is advisable to set a fastify address of `0.0.0.0` because these containers do not default to exposing mapped ports to localhost.

For containers built and run specifically by the Docker Daemon, fastify-cli is able to detect that the server process is running within a Docker container and the `0.0.0.0` listen address is set automatically.

Other containerization tools (eg. Buildah and Podman) are not detected automatically, so the `0.0.0.0` listen address must be set explicitly with either the `--address` flag or the `FASTIFY_ADDRESS` environment variable.

#### Fastify version discovery

If Fastify is installed as a project dependency (with `npm install --save fastify`),
then `fastify-cli` will use that version of Fastify when running the server.
Otherwise, `fastify-cli` will use the version of Fastify included within `fastify-cli`.

#### Migrating out of fastify-cli start

If you would like to turn your application into a standalone executable,
just add the following `server.js`:

```js
'use strict'

// Read the .env file.
require('dotenv').config()

// Require the framework
const Fastify = require('fastify')

// Require library to exit fastify process, gracefully (if possible)
const closeWithGrace = require('close-with-grace')

// Instantiate Fastify with some config
const app = Fastify({
  logger: true
})

// Register your application as a normal plugin.
const appService = require('./app.js')
app.register(appService)

// delay is the number of milliseconds for the graceful close to finish
const closeListeners = closeWithGrace({ delay: process.env.FASTIFY_CLOSE_GRACE_DELAY || 500 }, async function ({ signal, err, manual }) {
  if (err) {
    app.log.error(err)
  }
  await app.close()
})

app.addHook('onClose', (instance, done) => {
  closeListeners.uninstall()
  done()
})

// Start listening.
app.listen({ port: process.env.PORT || 3000 }, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})
```

#### Unhandled rejections

fastify-cli uses [make-promises-safe](https://github.com/mcollina/make-promises-safe) to avoid memory leaks
in case of an `'unhandledRejection'`.

### generate

`fastify-cli` can also help with generating some project scaffolding to
kickstart the development of your next Fastify application. To use it:

1. `fastify generate <yourapp>`
2. `cd yourapp`
3. `npm install`

The sample code offers you the following npm tasks:

* `npm start` - starts the application
* `npm run dev` - starts the application with
  [`pino-pretty`](https://github.com/pinojs/pino-pretty) pretty logging
  (not suitable for production)
* `npm test` - runs the tests
* `npm run lint` - fixes files accordingly to linter rules, for templates generated with `--standardlint`

You will find three different folders:
- `plugins`: the folder where you will place all your custom plugins
- `routes`: the folder where you will declare all your endpoints
- `test`: the folder where you will declare all your test

Finally, there will be an `app.js` file, which is your entry point.
It is a standard Fastify plugin and you will not need to add the `listen` method to run the server, just run it with one of the scripts above.

If the target directory exists `fastify generate` will fail unless the target directory is `.`, as in the current directory.

If the target directory is the current directory (`.`) and it already contains a `package.json` file, `fastify generate` will fail. This can
be overidden with the `--integrate` flag:

`fastify generate . --integrate`

This will add or alter the `main`, `scripts`, `dependencies` and `devDependencies` fields on the `package.json`. In cases of file name collisions
for any files being added, the file will be overwritten with the new file added by `fastify generate`. If there is an existing `app.js` in this scenario,
it will be overwritten. Use the `--integrate` flag with care.

#### Options

| Description | Full command |
| --- | --- |
| To generate ESM based JavaScript template | `--esm` |
| Use the TypeScript template | `--lang=ts`, `--lang=typescript` |
| Overwrite it when the target directory is the current directory (`.`) | `--integrate`|
| For JavaScript template, optionally includes Standard linter to fix code style issues | `--standardlint`|

### generate-plugin

`fastify-cli` can help you improve your plugin development by generating a scaffolding project:

1. `fastify generate-plugin <yourplugin>`
2. `cd yourplugin`
3. `npm install`

The boilerplate provides some useful npm scripts:
* `npm run unit`: runs all unit tests
* `npm run lint`: to check your project's code style
* `npm run test:typescript`: runs types tests
* `npm test`: runs all the checks at once

### readme

`fastify-cli` can also help with generating a concise and informative readme for your plugin. If no `package.json` is provided a new one is generated automatically.
To use it:

1. `cd yourplugin`
2. `fastify readme <path-to-your-plugin-file>`

Finally, there will be a new `README.md` file, which provides internal information about your plugin e.g:

* Install instructions
* Example usage
* Plugin dependencies
* Exposed decorators
* Encapsulation semantics
* Compatible Fastify version

### generate-swagger

if your project uses `@fastify/swagger`, `fastify-cli` can generate and write out the resulting Swagger/OpenAPI schema for you.

`fastify generate-swagger app.js`

### linting

`fastify-cli` is unopinionated on the choice of linter. We recommend you to add a linter, like so:

```diff
"devDependencies": {
+ "standard": "^11.0.1",
}

"scripts": {
+ "pretest": "standard",
  "test": "tap test/**/*.test.js",
  "start": "fastify start -l info app.js",
  "dev": "fastify start -l info -P app.js",
+ "lint": "standard --fix"
},
```

## Test helpers

When you use `fastify-cli` to run your project you need a way to load your application because you can run the CLI command.
To do so, you can use the this module to load your application and give you the control to write your assertions.
These utilities are async functions that you may use with the [`node-tap`](https://www.npmjs.com/package/tap) testing framework.

There are two utilities provided:

- `build`: builds your application and returns the `fastify` instance without calling the `listen` method.
- `listen`: starts your application and returns the `fastify` instance listening on the configured port.

Both of these utilities have the `function(arg, pluginOptions, serverOptions)` parameters:

- `cliArgs`: is a string or a string array within the same arguments passed to the `fastify-cli` command.
- `pluginOptions`: is an object containing the options provided to the started plugin (eg: `app.js`).
- `serverOptions`: is an object containing the additional options provided to fastify server, similar to the `--options` command line argument

```js
// load the utility helper functions
const { build, listen } = require('fastify-cli/helper')

// write a test
const { test } = require('tap')
test('test my application', async t => {
  const argv = ['app.js']
  const app = await build(argv, {
    extraParam: 'foo'
  })
  t.teardown(() => app.close())

  // test your application here:
  const res = await app.inject('/')
  t.same(res.json(), { hello: 'one' })
})
```

Log output is consumed by tap. If log messages should be logged to the console
the logger needs to be configured to output to stderr instead of stdout.

```js
const logger = {
  transport: {
    target: 'pino-pretty',
    options: {
      destination: 2,
    },
  },
}
const argv = ['app.js']
test('test my application with logging enabled', async t => {
  const app = await build(argv, {}, { logger })
  t.teardown(() => app.close())

  // test your application here:
  const res = await app.inject('/')
  t.same(res.json(), { hello: 'one' })
})
```




## Contributing
If you feel you can help in any way, be it with examples, extra testing, or new features please open a pull request or open an issue.

### How to execute the CLI
Instead of using the `fastify` keyword before each command, use `node cli.js`
<br/>Example: replace `fastify start` with `node cli.js start`

## License
**[MIT](https://github.com/fastify/fastify-cli/blob/master/LICENSE)**
