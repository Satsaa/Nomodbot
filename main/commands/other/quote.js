const fs = require('fs')
let myUtil = require('../../myutil.js')
let quotes = {}

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    let short = nmb.bot[channel].quotes

    if (!(quotes.hasOwnProperty(channel))) {
      fs.access('./data/' + channel + '/quotes.json', fs.constants.F_OK, (err) => {
        if (err) { // create channel quote base
          fs.writeFile('./data/' + channel + '/quotes.json', '[]', (err) => {
            if (!err) {
              console.log(`* [${channel}] Created quote file`)
              resolve(quote(channel, params, short))
            } else {
              console.log(`* [${channel}] FAILED TO CREATE QUOTE FILE: ${err}`)
            }
          })
        } else { // file is present
          resolve(quote(channel, params, short))
        }
      })
    } else resolve(quote(channel, params, short))

    function quote (channel, params, short) {
      if (typeof params[1] !== 'undefined') {
        if (params[1].toLowerCase() === 'list') { // list quotes
          return 'Unsupported'
        } else if (params[1].toLowerCase() === 'add') { // add a quote
          if (!nmb.bot.config.masters.includes(userstate['username'])) return 'Insufficient permissions to add quotes!'
          if (!params[2]) return 'You must specify text for the quote! (param 2+)'
          short[short.length] = params.slice(2).join(' ')
          save(channel, short)
          return `Added quote ${short.length}}`
        } else if (params[1].toLowerCase() === 'del') { // delete a quote
          if (!nmb.bot.config.masters.includes(userstate['username'])) return 'Insufficient permissions to delete quotes!'
          if (!params[2]) return 'You must specify a quote index! (param 2)'
          if (isNaN(parseInt(params[2], 10))) return 'You must enter a valid number! (param 2)'
          if (typeof short[params[2] - 1] === 'undefined') return 'Invalid quote index'
          short.splice(params[2] - 1, 1)
          save(channel, short)
          return `Deleted quote ${params[2]}: ${short.splice(params[2] - 1, 1)}`
        }
      }
      let index = Math.floor(params[1]) // null if omitted and below is true
      if (isNaN(index)) index = myUtil.getRandomInt(0, short.length)
      else index = myUtil.smartIndex(index, short.length)

      return `${index}: ${short[index - 1]}`
    }

    function save (channel, quotes) {
      fs.writeFile('./data/' + channel + '/quotes.json', JSON.stringify(quotes, null, 2), (err) => {
        if (!err) {
          console.log(`* [${channel}] Modified quote file`)
        } else {
          console.log(`* [${channel}] FAILED TO MODIFY QUOTE FILE: ${err}`)
        }
      })
    }
  })
}

module.exports.help = (params) => {
  return new Promise((resolve, reject) => {
    resolve(`Disaplays a channel quote: ${params[1]} [<index>]. Add: ${params[1]} add <quote...>. Delete: ${params[1]} del[ete] <index>`)
  })
}
