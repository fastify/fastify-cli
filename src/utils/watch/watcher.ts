import chokidar from 'chokidar'

export function spawnWatcher (directory: string, ignored: RegExp): chokidar.FSWatcher {
  return chokidar.watch(directory, { ignored })
}
