const chalk = require('chalk')
const { stop, runFastify } = require('../../start')

const {
  GRACEFUL_SHUT,
  READY,
  TIMEOUT
} = require('./constants.js')

const fastify = runFastify(process.argv.splice(2))
const type = process.env.childEvent

process.send({ type: type, err: null })

fastify.ready(err => {
  process.send({ type: READY, err: err })
  if (err) { stop(err) }
})

process.on('message', function (event) {
  if (event === GRACEFUL_SHUT) {
    const message = chalk.red('[fastify-cli] process forced end')
    setTimeout(exit.bind({ message }), TIMEOUT).unref()
    fastify.close(() => {
      process.exit(0)
    })
  }
})

process.on('uncaughtException', (err) => {
  console.log(err)
  const message = chalk.red('[fastify-cli] app crashed - waiting for file changes before starting...')
  // fastify.close(exit) // It's looks that only happend fastify normally startup. so we should detect fastify is normally runing, it's normally running that graceful exit happen, other case I think it's better immediately exec process.exit(1)
  // setTimeout(exit.bind({ message }), TIMEOUT).unref()
  exit.bind({ message })()
})

function exit () {
  if (this) { console.log(this.message) }
  process.exit(1)
}
