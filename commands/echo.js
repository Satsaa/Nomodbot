module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    if (params.length !== 0) {
      if (params[1].startsWith('/') || params[1].startsWith('.') || params[1].startsWith('\\')) {
        resolve('Nice try leatherman')
      } else resolve(params.slice(1).join(' '))
    }
  })
}

module.exports.help = (params) => {
  return new Promise((resolve, reject) => {
    resolve(`Repeat text: ${params[1]} <text...>`)
  })
}
