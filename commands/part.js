module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    params.shift()
    params.forEach(channel => {
      if (channel.startsWith('#')) {
        noModBot.partChannel(channel)
      } else {
        noModBot.partChannel('#' + channel)
      }
    })
    resolve(null)
  })
}

module.exports.help = () => {
  return new Promise((resolve, reject) => {
    resolve('Part/leave this or, one or multiple channels: command [<channel> ...]')
  })
}
