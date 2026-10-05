'use strict'

const { setTimeout } = require('node:timers/promises')

module.exports = async function (fastify, opts) {
  fastify.addHook('onListen', async () => {
    setImmediate(() => process.stdout.write('application-ready\n'))
  })
  fastify.addHook('onClose', async () => {
    await setTimeout(200)
    process.stdout.write('application-closed\n')
  })
}
