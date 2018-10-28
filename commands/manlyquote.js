let quotes = require('../data/global/quotes/manlyQuotes.json')
let util = require('../util.js')

module.exports.run = (params) => {
  let random = 1
  params[0] = params[0] - 1
  if (isNaN(parseInt(params[0], 10)) || params[0] > quotes.length) {
    random = util.getRandomInt(0, quotes.length)
  } else {
    random = params[0]
  }
  return (params[0] > quotes.length || params[0] < 0 ? 'Max index: ' + quotes[quotes.length - 1] : quotes[random])
}

module.exports.help = () => {
  return 'Returns a random manly quote. command [<index>]'
}
