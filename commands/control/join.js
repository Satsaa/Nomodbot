module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    params.shift() // remove command name
    params.forEach(channel => {
      if (channel.startsWith('#')) {
        if (channel.length < 4) resolve(`Invalid channel: '${channel}'`)
        else noModBot.joinChannel(channel)
      } else {
        if (channel.length < 3) resolve(`Invalid channel: '${channel}'`)
        else noModBot.joinChannel('#' + channel)
      }
    })
    resolve(null)
  })
}

module.exports.help = () => {
  return new Promise((resolve, reject) => {
    resolve('Join one or multiple channels: command <channels...>')
  })
}
