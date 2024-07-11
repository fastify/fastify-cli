// Internal Cache
const moduleCache = new Map()

type ESMImport = <R = any>(name: string) => Promise<R>
// eslint-disable-next-line no-new-func
export const _esmImport = new Function('modulePath', 'return import(modulePath)') as ESMImport

export async function _import<T = any> (name: string): Promise<T> {
  const module = moduleCache.get(name) ?? await _esmImport(name)
  moduleCache.set(name, module)
  return module
}
