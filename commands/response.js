const fs = require('fs')

let twitch = {}
module.exports.refer = (twitchRef) => {
  twitch = twitchRef
}

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    if (typeof params[1] !== 'undefined') {
      if (params[1].toLowerCase() === 'add') { // add a response
        if (!params[2]) resolve('You must specify a command name! (param 2)')
        if (!params[3]) resolve('You must specify a response! (param 3+)')
        twitch.bot[channel].custom_commands[params[2]] = params.slice(3).join(' ')
        resolve(`Response ${params[2]} added`)
      } else if (params[1].toLowerCase() === 'del') { // delete a response
        if (!params[2]) resolve('You must specify a response command to delete! (param 2)')
        delete twitch.bot[channel].custom_commands[params[2]]
        resolve(`Response ${params[2]} deleted`)
      }
    }
    resolve(`Add a response: ${params[0]} add <command> <response...>. Delete a response: ${params[0]} del <command>`)
  })
}

module.exports.help = () => {
  return new Promise((resolve, reject) => {
    resolve('Add a response: command add <command> <response...>. Delete a response: command del <command>')
  })
}
