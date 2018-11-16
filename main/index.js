const fs = require('fs')

global.nmb = require('/main/twitch.js')

require('/main/twitter.js')

nmb.bot.startTime = Date.now()

process.on('unhandledRejection', (error, p) => {
  console.log('Unhandled Rejection: Promise', p, 'Error:', error)
  console.log(error.stack)
})

// No exithandling if you kill the process... for example ctrl+alt+m in vs code
function exitHandler (options, exitCode) {
  if (options.cleanup) {
    let channels = []
    for (var key in nmb.bot) {
      if (key.startsWith('#')) {
        channels.push(key)
      }
    }
    channels.forEach((channel) => {
      nmb.logger.endStreamSync(channel)

      if (typeof nmb.bot[channel].channel !== 'undefined') {
        console.log(`* [${channel}] Channel saved`)
        fs.writeFileSync('./data/' + channel + '/channel.json', JSON.stringify(nmb.bot[channel].channel, null, 2), 'utf8')
      } else console.log(`* [${channel}] Channel not saved due to being undefined`)
    })
    fs.writeFileSync('./data/global/internal.json', JSON.stringify(nmb.bot.internal, null, 2), 'utf8')
    console.log(`* [BOT] Internals saved`)
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
process.on('SIGQUIT', exitHandler.bind(null, { exit: true }))

// catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { exit: true }))
