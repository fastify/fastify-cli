// https://stackoverflow.com/questions/2970525/converting-any-string-into-camel-case
export function toCamelCase (str: string): string {
  return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function (match, index) {
    if (+match === 0) return '' // or if (/\s+/.test(match)) for white spaces
    return index === 0 ? match.toLowerCase() : match.toUpperCase()
  })
}

// https://github.com/jonschlinkert/dashify
// we inline the code here
export function toDashify (str: string): string {
  return str.trim()
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\W/g, m => /[À-ž]/.test(m) ? m : '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, m => '-')
    .toLowerCase()
}
