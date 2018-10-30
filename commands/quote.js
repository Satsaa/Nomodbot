const fs = require('fs')
let util = require('../util.js')
let quotes = {}

module.exports.run = (channel, userstate, params) => {
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
    } else resolve(quote(channel, params))

    function quote (channel, params) {
      quotes[channel] = require('../data/channel/quotes/' + channel + '.json')

      if (typeof params[1] !== 'undefined') {
        if (params[1].toLowerCase() === 'list') { // list quotes
          return 'Unsupported'
        } else if (params[1].toLowerCase() === 'add') { // add a quote
          if (!params[2]) return 'You must specify text for the quote! (param 2+)'
          quotes[channel][quotes[channel].length] = params.slice(2).join(' ')
          save(channel, quotes[channel])
          return `Added quote ${quotes[channel].length}: ${params.slice(2).join(' ')}`
        } else if (params[1].toLowerCase() === 'del') { // delete a quote
          if (!params[2]) return 'You must specify a quote index! (param 2)'
          if (isNaN(parseInt(params[2], 10))) return 'You must enter a valid number! (param 2)'
          if (typeof quotes[channel][params[2] - 1] === 'undefined') return 'Invalid quote index'
          quotes[channel].splice(params[2] - 1, 1)
          save(channel, quotes[channel])
          return 'Deleted quote ' + (params[2])
        }
      }
      let random = 1
      let index = Math.floor(params[1] - 1)
      if (isNaN(parseInt(index, 10)) || index > quotes[channel].length) {
        random = util.getRandomInt(0, quotes[channel].length)
      } else {
        random = index
      }
      return (`${isNaN(index) ? random + 1 : ''} ${index >= quotes[channel].length || index < 0 ? `Max index: ${quotes[channel].length} ${quotes[channel][quotes[channel].length - 1]}` : quotes[channel][random]}`)
    }

    function save (channel, quotes) {
      fs.writeFile('./data/channel/quotes/' + channel + '.json', JSON.stringify(quotes, null, 2), (err) => {
        if (!err) {
          console.log(`* [${channel}] Modified quote file`)
        } else {
          console.log(`* [${channel}] FAILED TO MODIFY QUOTE FILE: ${err}`)
        }
      })
    }
  })
}

module.exports.help = () => {
  return new Promise((resolve, reject) => {
    resolve('Returns a channel quote: command [<index>]. Returns list of quotes: command list. Adds a quote: command add <quote...>. Deletes a quote: command del <index>')
  })
}
