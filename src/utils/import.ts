const moduleCache = new Map()

type ESMImport = <R = any>(name: string) => Promise<R>
// eslint-disable-next-line @typescript-eslint/no-implied-eval,no-new-func
export const _esmImport = new Function('modulePath', 'return import(modulePath)') as ESMImport

export async function _import<T = any> (name: string): Promise<T> {
  if (moduleCache.has(name)) return moduleCache.get(name)
  const module = await _esmImport(name)
  moduleCache.set(name, module)
  return module
}
