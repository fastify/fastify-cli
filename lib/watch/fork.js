const chalk = require('chalk')
const { stop, runFastify } = require('../../start')

const GRACEFUL_SHUT = 'GRACEFUL SHUTDOWN'
const READY = 'ready'

const fastify = runFastify(process.argv.splice(2))
const type = process.env.childEvent

process.send({ type: type, err: null })

fastify.ready(err => {
  process.send({ type: READY, err: err })
  if (err) { stop(err) }
})

process.on('message', function (event) {
  if (event === GRACEFUL_SHUT) {
    const timeout = setTimeout(function () {
      process.exit(1)
    }, 5000)

    fastify.close(() => {
      timeout.unref()
      process.exit(0)
    })
  }
})

process.on('uncaughtException', (err) => {
  fastify.close()
  console.log(err)
  console.log(chalk.red('[fastify-cli] app crashed - waiting for file changes before starting...'))
  process.exit(1)
})
