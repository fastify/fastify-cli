'use strict'

module.exports = {
  port: 5000,
  address: 'fastify.dev:9999',
  prefix: 'FASTIFY_',
  watch: true,
  prettyLogs: true,
  debugPort: 4000,
  pluginTimeout: 9 * 1000,
  forceCloseConnections: true,
  closeGraceDelay: 1000
}
