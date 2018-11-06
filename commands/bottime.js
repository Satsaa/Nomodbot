let myUtil = require('../myutil.js')

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    let botTime = myUtil.MSToDHMS(Date.now() - noModBot.bot.startTime)
    resolve(`Bot uptime: ${botTime[0]}d ${botTime[1]}h ${botTime[2]}m ${botTime[3]}s`)
  })
}

module.exports.help = () => {
  return new Promise((resolve, reject) => {
    resolve('Returns bot uptime.')
  })
}
