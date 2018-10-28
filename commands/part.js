let twitch = {}
module.exports.refer = (twitchRef) => {
  twitch = twitchRef
}

module.exports.run = (params) => {
  params.forEach(channel => {
    if (channel.startsWith('#')) {
      twitch.partChannel(channel)
    } else {
      twitch.partChannel('#' + channel)
    }
  })
}

module.exports.help = () => {
  return 'Part/leave one or multiple channels. command <channel> ...'
}
