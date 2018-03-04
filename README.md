# fastify-cli

[![Greenkeeper badge](https://badges.greenkeeper.io/fastify/fastify-cli.svg)](https://greenkeeper.io/)

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/) [![Build Status](https://travis-ci.org/fastify/fastify-cli.svg?branch=master)](https://travis-ci.org/fastify/fastify-cli)

Command line tools for [fastify](https://github.com/mcollina/fastify).
Write and run a route with one single command!

## Install
```bash
npm install fastify-cli --global
```

## Usage
Example:
```js
// plugin.js
module.exports = function (fastify, options, next) {
  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })
  next()
}
```
You can easily run it with:
```bash
$ fastify plugin.js
```
If fastify has been installed local to plugin.js that copy will be used instead of the global copy included with fastify-cli.

You can use `async` functions too, and make your plugin more concise:
```js
// async-await-plugin.js
module.exports = async function (fastify, options) {
  fastify.get('/', async function (req, reply) {
    return { hello: 'world' }
  })
}
```

CLI options:
```bash
Usage: fastify [opts] <file>

  -p, --port
      Port to listen on (default to 3000)

  -a, --address
      Address to listen on

  -s, --socket
      Socket to listen on

  -l, --log-level
      Log level (default to fatal)

  -P, --pretty-logs
      Prints pretty logs

  -o, --options
      Use custom options

  -p, --prefix
      Set the prefix

  -h, --help
      Show this help message

```

If you want to use custom options, just export an options object with your route and run the cli command with the `--options` flag.
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

## Contributing
If you feel you can help in any way, be it with examples, extra testing, or new features please open a pull request or open an issue.

The code follows the Standard code style.
[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

## License
**[MIT](https://github.com/delvedor/fastify-cli/blob/master/LICENSE)**

*The software is provided "as is", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose and non infringement. In no event shall the authors or copyright holders be liable for any claim, damages or other liability, whether in an action of contract, tort or otherwise, arising from, out of or in connection with the software or the use or other dealings in the software.*

Copyright © 2016-2017 Tomas Della Vedova
