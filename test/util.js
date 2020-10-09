const util = require('util')
const sgetOriginal = require('simple-get').concat
sgetOriginal[util.promisify.custom] = (opts, cb) => {
  return new Promise((resolve, reject) => {
    sgetOriginal(opts, (err, response, body) => {
      if (err) return reject(err)
      return resolve({ response, body })
    })
  })
}

module.exports = { sgetOriginal }
