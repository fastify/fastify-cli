'use strict'

const arrayToRegExp = (arr) => {
  const reg = arr.map((file) => {
    if (/^\./.test(file)) { return `\\${file}` }
    return file
  }).join('|')
  return new RegExp(`(${reg})`)
}

module.exports = {
  arrayToRegExp
}
