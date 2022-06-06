import { ChildProcess, fork } from 'child_process'
import { gray, red } from 'colorette'
import EventEmitter from 'events'
import { join, relative } from 'path'
import { normalizeStartOptions, StartOption } from '../start'
import { GRACEFUL_SHUTDOWN } from './events'
import { normalizeIgnores } from './options'
import { spawnWatcher } from './watcher'

const forkPath = join(__dirname, './fastify.js')

export async function watch (_o?: Partial<StartOption>): Promise<EventEmitter & { stop: Function }> {
  // we should spawn a instance that hold node process non-exit
  const interval = setInterval(() => {}, 1000000)
  const options = await normalizeStartOptions(_o)
  const ee: EventEmitter & { stop: Function } = new EventEmitter() as any
  let stopAll = false
  let childs: ChildProcess[] = []

  const stop = (watcher?: any, err?: any): void => {
    for (const child of childs) {
      child.kill()
    }

    childs = []

    if (err !== undefined) {
      console.log(red(err))
    }

    if (watcher !== undefined) {
      stopAll = true
      clearInterval(interval)
      return watcher.close()
    }
  }

  let isReady = false

  const run = (event: string): ChildProcess => {
    const env = Object.assign({}, process.env, { CHILD_EVENT: event, START_OPTIONS: JSON.stringify(options) })

    const child = fork(forkPath, {
      env,
      cwd: process.cwd()
    })

    child.on('exit', function (code, signal) {
      if (code !== 0) {
        stop()
      }
      if (childs.length === 0 && !stopAll) {
        childs.push(run('restart'))
      }
      return null
    })

    child.on('message', function (event: { type: string, err?: any }) {
      const { type, err } = event
      if (err !== undefined && err !== null) {
        ee.emit('error', err)
        return
      }

      if (type === 'ready') {
        if (isReady) {
          return
        }

        isReady = true
      }

      ee.emit(type, err)
    })

    return child
  }

  childs.push(run('start'))

  const watcher = spawnWatcher(process.cwd(), normalizeIgnores(options.watchIgnorePattern))
  watcher.on('ready', function () {
    watcher.on('all', function (event, path) {
      console.log('watcher', event, path)
      if (options.watchVerbose) {
        console.log(gray(`[fastify-cli] watch - '${event}' occurred on '${relative(process.cwd(), path)}'`))
      }

      try {
        const child = childs.shift()
        child?.send(GRACEFUL_SHUTDOWN)
      } catch (err: any) {
        if (childs.length !== 0) {
          console.log(red(err))
          stop(watcher, err)
        }
        childs.push(run('restart'))
      }
    })
  })

  ee.on('error', function (err) {
    stop(watcher, err)
  })

  ee.on('close', function () {
    stop(watcher)
  })

  ee.stop = stop.bind(null, watcher)

  return ee
}
