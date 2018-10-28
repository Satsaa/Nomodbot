let twitch = {}
module.exports.refer = (twitchRef) => {
  twitch = twitchRef
}

module.exports.run = (params) => {
  params.forEach(channel => {
    if (channel.startsWith('#')) {
      twitch.joinChannel(channel)
    } else {
      twitch.joinChannel('#' + channel)
    }
  })
}

module.exports.help = () => {
  return 'Join one or multiple channels. command <channel> ...'
}
