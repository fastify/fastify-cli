export function normalizeIgnores (ignore: string): RegExp {
  const ignores = ignore.split(' ').map((item) => item.trim()).filter((item) => item.length)
  const regexp = ignores.map((file) => {
    if (/^\./.test(file)) { return `\\${file}` }
    return file
  }).join('|')
  return new RegExp(`(${regexp})`)
}
