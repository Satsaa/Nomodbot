
module.exports.execute = (value) => {
  return new Promise(function (resolve, reject) {
    setTimeout(() => {
      if (value !== 'asd') {
        resolve(value)
      } else {
        reject(new Error('No params, no echo'))
      }
    }, 2000)
  })
}
