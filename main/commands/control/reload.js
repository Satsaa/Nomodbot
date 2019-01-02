const fs = require('fs')

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    if (typeof params[1] !== 'undefined') {
      if (params[1] === 'global') {
        if (!params[2]) return resolve('Define a file in the global folder (param 2)')
        fs.readFile('./data/global/' + params[2] + '.json', (err, data) => {
          if (err) return resolve(`${err.name}: ${err.code}`)
          else resolve(null)
          delete nmb.bot[params[2]]
          nmb.bot[params[2]] = JSON.parse(data)
          console.log(`* [${channel}] reloaded ${params[2]}.json`)
        })
      } else {
        fs.readFile('./data/' + channel + '/' + params[1] + '.json', (err, data) => {
          if (err) return resolve(`${err.name}: ${err.code}`)
          else resolve(null)
          delete nmb.bot[channel][params[1]]
          nmb.bot[channel][params[1]] = JSON.parse(data)
          nmb.checkDefaults(channel, params[1]) // Default settings were overwritten so we reload them again
          console.log(`* [${channel}] reloaded ${params[1]}.json`)
        })
      }
    } else resolve(`Reload an internal file: ${params[0]} [global] <file>`)
  })
}

module.exports.help = (params) => {
  return new Promise((resolve, reject) => {
    resolve(`Reload an internal file: ${params[1]} [global] <file>`)
  })
}
