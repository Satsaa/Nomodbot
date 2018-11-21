module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    if (params.length > 1) {
      resolve(params.slice(1).join(' '))
    }
  })
}

module.exports.help = (params) => {
  return new Promise((resolve, reject) => {
    resolve(`Repeat text: ${params[1]} <text...>`)
  })
}
