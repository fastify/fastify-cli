'use strict'

const chalk = require('chalk')
const { stop, runFastify } = require('../../start')

const {
  GRACEFUL_SHUT,
  READY,
  TIMEOUT
} = require('./constants.js')

let fastify

function exit () {
  if (this) { console.log(chalk.red(this.message)) }
  process.exit(1)
}

process.on('message', function (event) {
  if (event === GRACEFUL_SHUT) {
    const message = chalk.red('[fastify-cli] process forced end')
    setTimeout(exit.bind({ message }), TIMEOUT).unref()
    if (fastify) {
      fastify.close(() => {
        process.exit(0)
      })
    } else {
      process.exit(0)
    }
  }
})

process.on('uncaughtException', (err) => {
  console.log(chalk.red(err))
  const message = chalk.red('[fastify-cli] app crashed - waiting for file changes before starting...')
  exit.bind({ message })()
})

const main = async () => {
  fastify = await runFastify(process.argv.splice(2))
  const type = process.env.childEvent

  process.send({ type, err: null })

  try {
    await fastify.ready()
    process.send({ type: READY })
  } catch (err) {
    stop(err)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
