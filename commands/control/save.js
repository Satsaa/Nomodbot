const fs = require('fs')

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    noModBot.save()
    resolve(null)
  })
}

module.exports.help = (params) => {
  return new Promise((resolve, reject) => {
    resolve('Save like on exiting')
  })
}
