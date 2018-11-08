const fs = require('fs')
let myUtil = require('../../myutil.js')
let quotes = {}

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    resolve(null)
    process.exit(0)
  })
}

module.exports.help = (params) => {
  return new Promise((resolve, reject) => {
    resolve('Exits the process')
  })
}
