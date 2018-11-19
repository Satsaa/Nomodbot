let myUtil = require('../../myutil.js')

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    let short = nmb.bot.log[channel]
    if (params[1]) {
      if (!params[1].startsWith('#')) params[1] = '#' + params[1]
      if (typeof nmb.bot.log[params[1]] === 'undefined') return resolve(`${params[1]} is not tracked :(`)
      short = nmb.bot.log[params[1]]
    }
    let dateStr = myUtil.dateString(nmb.bot.log[params[1] || channel].start_time * 1000)
    resolve(`There has been a total of ${short.messages} ${myUtil.plural(short.messages, 'message')} sent ${params[1] ? params[1].substring(1) : 'here'} since ${dateStr}`)
  })
}

module.exports.help = (params, channel) => {
  return new Promise((resolve, reject) => {
    resolve(`Get how many lines have been chatted on this channel: ${params[1]} [<channel>]. Logging for this channel started ${myUtil.dateString(nmb.bot.log[channel].start_time * 1000)}`)
  })
}
