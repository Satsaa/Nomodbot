module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    let short = noModBot.bot[channel]
    let cmds = []
    if (params[1] && params[1] === 'master') {
      for (let cmd in short.commands) {
        if (typeof short.commands[cmd] === 'object') {
          if (!short.commands[cmd].unlisted &&
            short.commands[cmd].userlvl && short.commands[cmd].userlvl === params[1]) cmds.push(cmd)
        }
      }
    } else { // any user
      for (let cmd in short.commands) {
        if (typeof short.commands[cmd] === 'object') {
          if (!short.commands[cmd].unlisted && !short.commands[cmd].userlvl) cmds.push(cmd)
        } else {
          cmds.push(cmd)
        }
      }
    }
    resolve(`Commands: ${cmds.join(', ')}`)
  })
}

module.exports.help = () => {
  return new Promise((resolve, reject) => {
    resolve('Returns list of commands: command [master].')
  })
}
