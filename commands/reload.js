const fs = require('fs')

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    if (!noModBot.bot.config.masters.includes(userstate['username'])) resolve('You must be a bot operator to reload internal files!')
    if (typeof params[1] !== 'undefined') {
      if (params[1] === 'global') {
        if (!params[2]) resolve(null)
        fs.readFile('./data/global/' + params[2] + '.json', (err, data) => {
          if (err) resolve(`${err.name}: ${err.message}`)
          delete noModBot.bot[params[2]]
          noModBot.bot[params[2]] = JSON.parse(data)
          console.log(`* [${channel}] reloaded ${params[2]}.json`)
        })
      } else {
        fs.readFile('./data/' + channel + '/' + params[1] + '.json', (err, data) => {
          if (err) resolve(err.name)
          delete noModBot.bot[channel][params[1]]
          noModBot.bot[channel][params[1]] = JSON.parse(data)
          console.log(`* [${channel}] reloaded ${params[1]}.json`)
        })
      }
      resolve(null)
    }
    resolve('Reload a file: command [\'global\'] <file>')
  })
}

module.exports.help = () => {
  return new Promise((resolve, reject) => {
    resolve('Reload a file: command [\'global\'] <file>')
  })
}