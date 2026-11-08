# __MY_PLUGIN__

[![neostandard javascript style](https://img.shields.io/badge/code%20style-neostandard-brightgreen?style=flat)](https://github.com/neostandard/neostandard)  ![CI workflow](__MY_PLUGIN_URL__
/workflows/CI%20workflow/badge.svg)

Supports Fastify versions `4.x`

## Install
```
npm i __MY_PLUGIN__
```

## Usage
Require `__MY_PLUGIN__` and register.
```js
const fastify = require('fastify')()

fastify.register(require('__MY_PLUGIN__'), {
  // put your options here
})

fastify.listen({ port: 3000 })
```

## Acknowledgements

## License

Licensed under [MIT](./LICENSE).<br/>
