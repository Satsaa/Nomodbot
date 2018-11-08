const fs = require('fs')

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
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
    resolve(`Reload an internal file: ${params[0]} [global] <file>`)
  })
}

module.exports.help = (params) => {
  return new Promise((resolve, reject) => {
    resolve(`Reload an internal file: ${params[1]} [global] <file>`)
  })
}
