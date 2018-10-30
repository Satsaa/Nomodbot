let twitch = {}
module.exports.refer = (twitchRef) => {
  twitch = twitchRef
}

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    params.shift()
    params.forEach(channel => {
      if (channel.startsWith('#')) {
        twitch.joinChannel(channel)
      } else {
        twitch.joinChannel('#' + channel)
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
