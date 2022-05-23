# __packageName__

Short description of the purpose of your plugin.

## Install

```
npm install __packageName__ --save
yarn add __packageName__
```

## Example

```js
const fastify = require('fastify')()
fastify.register(require('__packageName__'))
fastify.listen({ port: 3000 })
```

You can also start any Fastify plugin with the [Fastify-cli](https://github.com/fastify/fastify-cli):

```
fastify start __pluginFileName__
```

## Plugin

### Accessibility
<!-- Is your plugin fully encapsulated? If you use fastify-plugin or the hidden property 'skip-override' it's not -->

__accessibilityTemplate__

### Decorators
<!-- A list of all exposed decorators in your plugin -->

#### Fastify
<!-- Please define the method signature in typescript because it's well known and easy to write -->

__fastifyDecorators__

#### Reply
<!-- Please define the method signature in typescript because it's well known and easy to write -->

__replyDecorators__

## Dependencies

__pluginDeps__

## Compatible Fastify version

__minFastify__