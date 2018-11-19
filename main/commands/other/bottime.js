let myUtil = require('../../myutil.js')

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    resolve(`Bot uptime: ${myUtil.timeSince(nmb.bot.startTime)}`)
  })
}

module.exports.help = (params) => {
  return new Promise((resolve, reject) => {
    resolve('Returns bot uptime.')
  })
}
