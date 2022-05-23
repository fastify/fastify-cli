'use strict'

const fp = require('fastify-plugin')

module.exports = fp(async function (fastify, opts) {
  fastify.decorate('exampleDecorator', () => {
    return 'decorated'
  })
}, { fastify: '^4.x' })
