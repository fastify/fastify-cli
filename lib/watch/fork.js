const { stop, runFastify } = require('../../start')

const GRACEFUL_SHUT = 'GRACEFUL SHUTDOWN'
const FULLY_CLOSED = 'FULLY CLOSED'

const fastify = runFastify(process.argv.splice(2))
const { type } = process.env.childEvent
let timeout = null

process.send({ type: type, err: null })

fastify.ready(err => {
  if (err) { stop(err) }
  process.send({ type: 'ready', err: err })
})

fastify.addHook('onClose', (instance, done) => {
  clearTimeout(timeout)
  process.send({ type: FULLY_CLOSED, err: null })
  done()
})

process.on('message', function (event) {
  if (event === GRACEFUL_SHUT) {
    fastify.close()

    timeout = setTimeout(function () {
      process.send({ type: FULLY_CLOSED, err: null })
    }, 5000)
  }
})
