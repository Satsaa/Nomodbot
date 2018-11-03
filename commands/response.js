const fs = require('fs')

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    fs.access('./data/' + channel + '/responses.json', fs.constants.F_OK, (err) => {
      if (err) { // create channel response base
        fs.writeFile('./data/' + channel + '/responses.json', '{}', (err) => {
          if (!err) {
            console.log(`* [${channel}] Created response file`)
            resolve(main(channel, userstate, params))
          } else {
            console.log(`* [${channel}] FAILED TO CREATE RESPONSE FILE: ${err}`)
          }
        })
      } else { // file is present
        resolve(main(channel, userstate, params))
      }
    })

    function main (channel, userstate, params) {
      if (params[2].charAt(0) !== '?' && !noModBot.bot.config.masters.includes(userstate['username'])) return 'You must be a bot operator to edit responses without \'?\' prefix!'
      noModBot.bot[channel].responses = require('../data/' + channel + '/responses.json')
      if (typeof params[1] !== 'undefined') {
        if (params[1].toLowerCase() === 'add') { // add a response
          if (!params[2]) return 'You must specify a command name! (param 2)'
          if (!params[3]) return 'You must specify a response! (param 3+)'
          noModBot.bot[channel].responses[params[2].toLowerCase()] = params.slice(3).join(' ')
          saveResponses(channel)
          return `Response '${params[2].toLowerCase()}' added`
        } else if (params[1].toLowerCase() === 'del') { // delete a response
          if (!params[2]) return 'You must specify a response command to delete! (param 2)'
          if (!noModBot.bot[channel].responses.hasOwnProperty(params[2].toLowerCase())) return `Can't find "${params[2].toLowerCase()}"`
          delete noModBot.bot[channel].responses[params[2].toLowerCase()]
          saveResponses(channel)
          return `Response '${params[2].toLowerCase()}' deleted`
        }
      }
      return `Add a response: ${params[0]} add <command> <response...>. Delete a response: ${params[0]} del <command>`
    }

    function saveResponses (channel) {
      fs.writeFile('./data/' + channel + '/responses.json', JSON.stringify(noModBot.bot[channel].responses, null, 2), 'utf8', (err) => {
        if (err) throw err
      })
    }
  })
}

module.exports.help = () => {
  return new Promise((resolve, reject) => {
    resolve('Add a response: command add <command> <response...>. Delete a response: command del <command>')
  })
}
