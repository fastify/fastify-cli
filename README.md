# fastify-cli
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/) [![Build Status](https://travis-ci.org/delvedor/fastify-cli.svg?branch=master)](https://travis-ci.org/delvedor/fastify-cli)

Command line tools for [fastify](https://github.com/mcollina/fastify).  
Write and run a route with one single command!

## Install
```bash
npm install fastify-cli --save
```

## Usage
Example:
```js
// plugin.js
module.exports = function (fastify, options, next) {
  fastify.get('/', function (req, reply) {
    reply(null, { hello: 'world' })
  })
  next()
}
```
You can easily run it with:
```bash
$ fastify plugin.js
```

CLI options:
```bash
Usage: fastify [opts] <file>
  -p, --port
      Port to listen on (default to 3000)

  -l, --log-level
      Log level (default to fatal)

  -P, --pretty-logs
      Prints pretty logs

  -h, --help
      Show this help message
```

## Contributing
If you feel you can help in any way, be it with examples, extra testing, or new features please open a pull request or open an issue.

The code follows the Standard code style.  
[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

## License
**[MIT](https://github.com/delvedor/fastify-cli/blob/master/LICENSE)**

*The software is provided "as is", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose and non infringement. In no event shall the authors or copyright holders be liable for any claim, damages or other liability, whether in an action of contract, tort or otherwise, arising from, out of or in connection with the software or the use or other dealings in the software.*

Copyright © 2016 Tomas Della Vedova
