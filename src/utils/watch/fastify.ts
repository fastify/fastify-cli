import { red } from 'colorette'
import { FastifyInstance } from 'fastify'
import { start, stop } from '../start'
import { TIMEOUT } from './constants'
import { GRACEFUL_SHUTDOWN, READY } from './events'

function exit (this: any): void {
  if (this as boolean) { console.log(red('[fastify-cli] process forced end')) }
  process.exit(1)
}

// shared instance
let fastify: null | FastifyInstance = null

process.on('message', function (event) {
  console.log('message', event)
  if (event === GRACEFUL_SHUTDOWN) {
    const message = red('[fastify-cli] process forced end')
    setTimeout(exit.bind({ message }), TIMEOUT).unref()
    if (fastify !== null) {
      fastify.close(function () {
        process.exit(0)
      })
    } else {
      process.exit(0)
    }
  }
})

process.on('uncaughtException', function (err) {
  console.log(red(err as never as string))
  const message = red('[fastify-cli] app crashed - waiting for file changes before starting...')
  exit.bind({ message })()
})

async function main (): Promise<void> {
  const type = process.env.CHILD_EVENT
  let options: any = {}
  if (typeof process.env.START_OPTIONS === 'string') options = JSON.parse(process.env.START_OPTIONS)
  fastify = await start(options)

  process.send?.({ type, err: null })

  try {
    await fastify.ready()
    process.send?.({ type: READY })
  } catch (err: any) {
    stop(err)
  }
}

main().catch(function (err) {
  console.error(err)
  process.exit(1)
})
