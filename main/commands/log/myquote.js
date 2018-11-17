let myUtil = require('../../myutil.js')

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    let short = nmb.bot[channel].log
    let user = params[1] || userstate.username
    let index = null
    if (!params[2] && !isNaN(user)) { // allow use of lonely param[1] as index
      index = ~~user - 1
      user = userstate.username
    }
    let userLow = user.toLowerCase()
    if (userLow in short) { // check if logs exist of this user
      let length = short[userLow][1].length // amount of logged msgs
      if (userstate.username === userLow) length-- // if getting own quotes, ignore command calling message
      if (length < 1) return resolve(`${user} has no logs yet :( `) // no logs but is tracked somehow

      if (index === null && params[2]) index = Math.floor(params[2] - 1) // specified index and username
      else if (index === null && params[1]) index = myUtil.getRandomInt(0, length - 1)

      if (isNaN(index) || index === null) index = myUtil.getRandomInt(0, length - 1)
      else if (index < length * -1 - 1) index = 0
      else if (index < -1) index = length + index + 1 // negative
      else if (index === -1) index = 0
      else if (index > length - 1) index = length - 1

      let logOffset = nmb.logger.getOffset(short, userLow, index)
      nmb.logger.readAtOffset(channel, logOffset).then((result) => {
        resolve(`${myUtil.timeSince(result.ms * 1000, 1, false)} ago, ${myUtil.addOrdinal(index + 1)} message: ${result.user}: ${result.message}`)
      }).catch((err) => {
        resolve(`Error: ${err}`)
      })
    } else resolve(`${user} has no logs yet :( `)
  })
}

module.exports.help = (params, channel) => {
  return new Promise((resolve, reject) => {
    resolve(`Get a random quote from you: ${params[1]} [<index>]. Get a random quote from a user: ${params[1]} <user> [<index>]. Logging for this channel started ${myUtil.dateString(nmb.bot[channel].log.$start_time * 1000)}`)
  })
}
