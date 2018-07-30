const { runFastify } = require('./start')

const fastify = runFastify(process.argv.splice(2))

fastify.ready(err => {
  process.send({ type: 'ready', err: err })
})
