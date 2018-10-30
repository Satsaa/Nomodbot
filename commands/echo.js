module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    if (params.length !== 0) {
      resolve(params.slice(1).join(' '))
    }
  })
}

module.exports.help = () => {
  return new Promise((resolve, reject) => {
    resolve('Repeat text: command <text...>')
  })
}
