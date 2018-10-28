const fs = require('fs')
let util = require('../util.js')
let quotes = {}

module.exports.run = (channel, params) => {
  return new Promise((resolve, reject) => {
    if (!(quotes.hasOwnProperty(channel))) {
      fs.access('./data/channel/quotes/' + channel + '.json', fs.constants.F_OK, (err) => {
        if (err) { // create channel quote base
          fs.writeFile('./data/channel/quotes/' + channel + '.json', '[]', (err) => {
            if (!err) {
              console.log(`* [${channel}] Created quote file`)
              resolve(quote(channel, params))
            } else {
              console.log(`* [${channel}] FAILED TO CREATE QUOTE FILE: ${err}`)
            }
          })
        } else { // file is present
          resolve(quote(channel, params))
        }
      })
    }
    resolve(quote(channel, params))

    function quote (channel, params) {
      quotes[channel] = require('../data/channel/quotes/' + channel + '.json')
      let random = 1
      params[0] = params[0] - 1
      if (isNaN(parseInt(params[0], 10)) || params[0] > quotes[channel].length) {
        random = util.getRandomInt(0, quotes[channel].length)
      } else {
        random = params[0]
      }
      return (params[0] > quotes[channel].length || params[0] < 0 ? 'Max index: ' + quotes[channel][quotes[channel].length - 1] : quotes[channel][random])
    }
  })
}

module.exports.help = () => {
  return 'Returns a random channel quote. command [<index>]'
}
