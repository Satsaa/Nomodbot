let util = require('../util.js')

const artifact = new Date('2018-11-19T12:00:00-07:00')
module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    const time = util.MSToDHM(artifact - Date.now())

    resolve(`${time[0]}d ${time[1]}h ${time[2]}m until Artifact GabeN`)
  })
}

module.exports.help = () => {
  return new Promise((resolve, reject) => {
    resolve('Return time remaining till Artifact beta release GabeN')
  })
}
