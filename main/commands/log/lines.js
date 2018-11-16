let myUtil = require('../../myutil.js')

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    let short = nmb.bot[channel].log

    let self = !params[1]
    if (params[1] && params[1].toLowerCase() === userstate.username) self = true

    let userLow = params[1] || userstate['display-name']
    userLow = userLow.toLowerCase()
    if (userLow in short) { // check if logs exist of this user
      let length = short[userLow][1].length
      if (length < 1) { // no logs but is tracked somehow
        return resolve(`${params[1] ? params[1] : `@${userstate['display-name']} You`} ${youOrMe(self)}`)
      }
      length = length - (self ? 1 : 0)
      resolve(`${params[1] ? params[1] : `@${userstate['display-name']} You`} ${youOrMe2(self)} ${length} ${myUtil.plural(length, 'line')} here`)
    } else resolve(`${params[1] ? params[1] : `@${userstate['display-name']} You`} ${youOrMe(self)}`)
  })
}

// lidl functions
function youOrMe (me) {
  if (me) return `haven't chatted here before`
  else return `hasn't chatted here before`
}
function youOrMe2 (me) {
  if (me) return 'have chatted'
  else return 'has chatted'
}

module.exports.help = (params, channel) => {
  return new Promise((resolve, reject) => {
    resolve(`Get how many lines you have chatted: ${params[1]} [<user>]. Logging for this channel started ${myUtil.dateString(nmb.bot[channel].log.$start_time * 1000)}`)
  })
}
