let voters = []

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    if (nmb.bot[channel].giveaway.active) {
      nmb.bot[channel].giveaway.voters[userstate['user-id']] = {
        subscriber: userstate.subscriber,
        name: userstate['display-name']
      }
    }
  })
}

module.exports.help = (params) => {
  return new Promise((resolve, reject) => {
    resolve(`No help for you`)
  })
}
