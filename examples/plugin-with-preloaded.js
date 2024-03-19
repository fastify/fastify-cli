/* global GLOBAL_MODULE_1, GLOBAL_MODULE_3 */
'use strict'
const t = require('tap')

module.exports = async function (fastify, options) {
  fastify.get('/', async function (req, reply) {
    return { hasPreloaded: GLOBAL_MODULE_1 && GLOBAL_MODULE_3 }
  })
  fastify.addHook('onReady', function () {
    t.ok(GLOBAL_MODULE_1)
    t.ok(GLOBAL_MODULE_3)
  })
}
