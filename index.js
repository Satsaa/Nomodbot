const fs = require('fs')

global.noModBot = require('./nomodbot.js')

let twitter = require('./twitter.js')

function exitHandler (options, exitCode) {
  if (options.cleanup) {
    console.log(`* [BOT] Being saved`)
    let channels = []
    for (var key in noModBot.bot) {
      if (key.startsWith('#')) {
        channels.push(key)
      }
    }
    channels.forEach((channel) => {
      fs.writeFileSync('./data/' + channel + '/channel.json', JSON.stringify(noModBot.bot[channel].channel, null, 2), 'utf8')
    })
    console.log(`* [CHANNELS] Settings saved`)
    fs.writeFileSync('./data/global/userstate.json', JSON.stringify(noModBot.bot.global, null, 2), 'utf8')
    console.log(`* [BOT] State saved`)
  }
  if (exitCode || exitCode === 0) console.log(exitCode)
  if (options.exit) process.exit()
}

// do something when app is closing
process.on('exit', exitHandler.bind(null, { cleanup: true }))

// catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true }))

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, { exit: true }))
process.on('SIGUSR2', exitHandler.bind(null, { exit: true }))
process.on('SIGKILL', exitHandler.bind(null, { exit: true }))
process.on('SIGQUIT', exitHandler.bind(null, { exit: true }))

// catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { exit: true }))
