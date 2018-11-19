let myUtil = require('../../myutil.js')

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    let input = false
    if (params[1]) {
      input = '#' + params[1]
      if (typeof nmb.bot[input] === 'undefined') {
        return resolve(`${input.replace('#', '')} is not tracked :(`)
      }
    }
    if (typeof nmb.bot[input || channel] !== 'undefined') { // check if channel has logs
      let short = nmb.bot[input || channel].log
      let shortG = nmb.bot.log[input || channel]

      let users = shortG['users']
      let dateStr = myUtil.dateString(shortG.start_time * 1000)

      resolve(`There has been atleast ${users} ${myUtil.plural(users, 'user')} ` +
        `chatting ${input ? 'in' + input.replace('#', '') : 'here'} since ${dateStr}`)
    } else resolve(`${(input || channel).replace('#', '')} is not tracked :(`)
  })
}

module.exports.help = (params, channel) => {
  return new Promise((resolve, reject) => {
    resolve(`Get how many users have been tracked: ${params[1]} [<channel>]. Logging for this channel started ${myUtil.dateString(nmb.bot.log[channel].start_time * 1000)}`)
  })
}
