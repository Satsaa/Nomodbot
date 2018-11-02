module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    params.shift()
    params.forEach(channel => {
      if (channel.startsWith('#')) {
        noModBot.joinChannel(channel)
      } else {
        noModBot.joinChannel('#' + channel)
      }
    })
    resolve(null)
  })
}

module.exports.help = () => {
  return new Promise((resolve, reject) => {
    resolve('Join one or multiple channels: command <channel> ...')
  })
}
