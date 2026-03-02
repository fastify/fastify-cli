/* global GLOBAL_MODULE_1, GLOBAL_MODULE_3 */
'use strict'

const assert = require('node:assert/strict')

module.exports = async function (fastify, options) {
  fastify.get('/', async function (req, reply) {
    return { hasPreloaded: GLOBAL_MODULE_1 && GLOBAL_MODULE_3 }
  })
  fastify.addHook('onReady', function () {
    assert.ok(GLOBAL_MODULE_1)
    assert.ok(GLOBAL_MODULE_3)
  })
}
