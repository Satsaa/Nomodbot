let myUtil = require('../../myutil.js')

const artifact = new Date('2018-11-19T12:00:00-07:00')
module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    const time = myUtil.MSToDHMS(artifact - Date.now())

    resolve(`My favorite card is your credit card GabeN 👉 💳`)
  })
}

module.exports.help = (params) => {
  return new Promise((resolve, reject) => {
    resolve('Return time remaining till Artifact beta release GabeN')
  })
}
