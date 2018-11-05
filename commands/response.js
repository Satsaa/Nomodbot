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
      let local = noModBot.bot[channel].responses // reference for neat code
      if (params[2] && params[2].charAt(0) !== '?' && !noModBot.bot.config.masters.includes(userstate['username'])) return 'Insufficient permissions to edit responses without \'?\' prefix!'

      if (typeof params[1] !== 'undefined') {
        if (params[1].toLowerCase() === 'add') { // add a response
          if (!params[2]) return 'You must specify a command name! (param 2)'
          if (!params[3]) return 'You must specify a response! (param 3+)'
          if (local.hasOwnProperty(params[2].toLowerCase())) return `Response already exists! "${params[2].toLowerCase()}"`
          local[params[2].toLowerCase()] = params.slice(3).join(' ')
          saveResponses(channel, local)
          return `Response '${params[2].toLowerCase()}' added`
        } else if (params[1].toLowerCase() === 'del') { // delete a response
          if (!noModBot.bot.config.masters.includes(userstate['username'])) return 'Insufficient permissions to delete responses'
          if (!params[2]) return 'You must specify a response to delete! (param 2)'
          if (!local.hasOwnProperty(params[2].toLowerCase())) return `Can't find "${params[2].toLowerCase()}"`
          delete local[params[2].toLowerCase()]
          saveResponses(channel, local)
          return `Response '${params[2].toLowerCase()}' deleted`
        } else if (params[1].toLowerCase() === 'edit') { // edit a response
          if (!noModBot.bot.config.masters.includes(userstate['username'])) return 'Insufficient permissions to edit responses'
          if (!params[2]) return 'You must specify a command name! (param 2)'
          if (!params[3]) return 'You must specify a response! (param 3+)'
          let exists = local.hasOwnProperty(params[2].toLowerCase())
          local[params[2].toLowerCase()] = params.slice(3).join(' ')
          saveResponses(channel, local)
          if (exists) return `Response '${params[2].toLowerCase()}' added`
          return `Response '${params[2].toLowerCase()}' edited`
        }
      }
      return `Add a response: ${params[0]} add <command> <response...>. Delete a response: ${params[0]} del <command>. Edit a response: ${params[0]} edit <command>`
    }

    function saveResponses (channel, local) {
      fs.writeFile('./data/' + channel + '/responses.json', JSON.stringify(local, null, 2), 'utf8', (err) => {
        if (err) throw err
      })
    }
  })
}

module.exports.help = () => {
  return new Promise((resolve, reject) => {
    resolve('Add a response: command add <command> <response...>. Delete a response: command del <command>. Edit a response: command edit <command>')
  })
}
