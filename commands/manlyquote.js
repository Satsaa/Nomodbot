const fs = require('fs')
let quotes = require('../data/global/manlyQuotes.json')
let util = require('../util.js')

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    resolve(quote(channel, params))

    function quote (channel, params) {
      if (typeof params[1] !== 'undefined') {
        if (params[1].toLowerCase() === 'list') { // ?quote0 add1 pate2+ on homo
          return 'Unsupported'
        } else if (params[1].toLowerCase() === 'add') { // add a quote
          if (!noModBot.bot.config.masters.includes(userstate['username'])) return 'Insufficient permissions to add quotes!'
          if (!params[2]) return 'You must specify text for the quote! (param 2+)'
          quotes[quotes.length] = params.slice(2).join(' ')
          save(channel, quotes)
          return `Added quote ${quotes.length}: ${params.slice(2).join(' ')}`
        } else if (params[1].toLowerCase() === 'del') { // delete a quote
          if (!noModBot.bot.config.masters.includes(userstate['username'])) return 'Insufficient permissions to add quotes!'
          if (!params[2]) return 'You must specify a quote index! (param 2)'
          if (isNaN(parseInt(params[2], 10))) return 'You must enter a valid number! (param 2)'
          if (typeof quotes[params[2] - 1] === 'undefined') return 'Invalid quote index'
          quotes.splice(params[2] - 1, 1)
          save(channel, quotes)
          return 'Deleted quote ' + (params[2])
        }
      }
      let random = 1
      let index = Math.floor(params[1] - 1)
      if (isNaN(parseInt(index, 10)) || index > quotes.length) {
        random = util.getRandomInt(0, quotes.length)
      } else {
        random = index
      }
      return `${isNaN(index) ? random + 1 : ''} ${index >= quotes.length || index < 0 ? `Max index: ${quotes.length} ${quotes[quotes.length - 1]}` : quotes[random]}`
    }

    function save (channel, quotes) {
      fs.writeFile('./data/global/manlyQuotes.json', JSON.stringify(quotes, null, 2), (err) => {
        if (!err) {
          console.log(`* [GLOBAL] Modified manly file`)
        } else {
          console.log(`* [GLOBAL] FAILED TO MODIFY MANLYQUOTE FILE: ${err}`)
        }
      })
    }
  })
}

module.exports.help = () => {
  return new Promise((resolve, reject) => {
    resolve('Returns a manly quote: command [<index>]. Returns list of manliness: command list. Adds a manly quote: command add <quote...>. Deletes a manly quote: command del <index>')
  })
}
