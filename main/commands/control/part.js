module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    params.shift() // remove command name
    if (params[0]) {
      params.forEach((channel) => {
        if (channel.startsWith('#')) {
          if (channel.length < 4) return resolve(`Invalid channel: '${channel}'`)
          else nmb.partChannel(channel)
        } else {
          if (channel.length < 3) return resolve(`Invalid channel: '${channel}'`)
          else nmb.partChannel('#' + channel)
        }
      })
    } else nmb.partChannel(channel) // part current channel if no params
    resolve(null)
  })
}

module.exports.help = (params) => {
  return new Promise((resolve, reject) => {
    resolve(`Part one or multiple channels: ${params[1]} [<channels...>]`)
  })
}