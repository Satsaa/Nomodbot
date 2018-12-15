let myUtil = require('../../myutil.js')

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    let short = nmb.bot[channel].log

    if (params[1]) {
      if (params[1].toLowerCase() === userstate.username) var self = true
      else self = false
    } else self = true

    let userLow = params[1] || userstate['display-name']
    userLow = userLow.toLowerCase()
    if (userLow in short) { // check if logs exist of this user
      if (short[userLow][1].length < 1) { // no logs but is tracked somehow
        return resolve(`${self ? `@${userstate['display-name']} You` : params[1]} ${youOrMe(self)}`)
      }
      let seenMs = nmb.logger.getTime(short, userLow, short[userLow][2].length - (self ? 1 : 0)) * 1000

      resolve(`${self ? `@${userstate['display-name']} You` : params[1]} ${youOrMe2(self)} ${myUtil.timeSince(seenMs, 1, false)} ago`)
    } else resolve(`${self ? `@${userstate['display-name']} You` : params[1]} ${youOrMe(self)}`)
  })
}

// lidl functions
function youOrMe (me) {
  if (me) return 'have not been tracked here before'
  else return 'has not been tracked here before'
}
function youOrMe2 (me) {
  if (me) return 'were last seen here'
  else return 'was last seen here'
}

module.exports.help = (params, channel) => {
  return new Promise((resolve, reject) => {
    resolve(`Tell when was user seen last: ${params[1]} [<user>]. Logging for this channel started ${myUtil.dateString(nmb.bot.log[channel].start_time * 1000)}`)
  })
}
