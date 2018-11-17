let myUtil = require('../../myutil.js')

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    let input = false
    if (params[1]) input = '#' + params[1].toLowerCase() // param 1 can be used to define a channel
    if (input === channel) input = false // specifying current channel has no effect
    if (typeof nmb.bot[input || channel] !== 'undefined') { // check if logs exist of this channel
      let short = nmb.bot[input || channel].log

      let remaining = short['$messages'] // amount of logged msgs
      if (remaining < 1) return resolve(`${(input || channel).replace('#', '')} has no logs yet :( `) // no logs

      for (var user in short) {
        if (!user.startsWith('$')) {
          var ran = Math.random()
          if (ran < short[user][1].length / remaining) { // check if user gets randomly selected
            let index = myUtil.getRandomInt(0, short[user][1].length - 1)

            let logOffset = nmb.logger.getOffset(input || channel, user, index)
            nmb.logger.readAtOffset(input || channel, logOffset).then((result) => {
              let dateStr = myUtil.timeSince(result.ms * 1000, 1, false)
              resolve(`${dateStr} ago${input ? ` in ${input.replace('#', '')}` : ''}:
               ${result.user}: ${result.message}`)
            }).catch((err) => {
              resolve(`Error: ${err}`)
            })
            return
          }
          // console.log(`${remaining}/${short['$messages']}` +
          //  `at ${Math.round(short[user][1].length / remaining * 100)}%`)
          remaining -= short[user][1].length
        }
      } resolve(`Low chance out of bounds error`)
    } else resolve(`${(input || channel).replace('#', '')} has no logs yet :( `)
  })
}

module.exports.help = (params, channel) => {
  return new Promise((resolve, reject) => {
    resolve(`Get a random quote from this channel: ${params[1]} [<channel>]. Logging for this channel started ${myUtil.dateString(nmb.bot[channel].log.$start_time * 1000)}`)
  })
}
