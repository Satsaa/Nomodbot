const fs = require('fs')

// Emitter here to avoid things in an expertly fashion
const EventEmitter = require('events')

class Emitter extends EventEmitter {}

global.emitter = new Emitter()
exports.emitter = global.emitter

// load nmb
global.nmb = require('./twitch.js')

// load twitter "module"
require('./twitter.js')

process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at: Promise', p, 'reason:', reason)
  // application specific logging, throwing an error, or other logic here
})

// No exithandling if you kill the process... for example ctrl+alt+m in vs code
function exitHandler (options, exitCode) {
  let channels = []
  for (var key in nmb.bot) {
    if (key.startsWith('#')) {
      channels.push(key)
    }
  }
  emitter.emit('onExit', channels, exitCode)
  channels.forEach((channel) => {
    if (typeof nmb.bot[channel].channel !== 'undefined') {
      console.log(`* [${channel}] Channel saved`)
      fs.writeFileSync('./data/' + channel + '/channel.json', JSON.stringify(nmb.bot[channel].channel, null, 2), 'utf8')
    } else console.error(`* [${channel}] Channel undefined and not saved`)
  })

  if (typeof nmb.bot.internal !== 'undefined') {
    fs.writeFileSync('./data/global/internal.json', JSON.stringify(nmb.bot.internal, null, 2), 'utf8')
    console.log(`* [BOT] Internals saved`)
  } else console.error(`* [BOT] Internals undefined and not saved`)

  if (typeof nmb.bot.log !== 'undefined') {
    fs.writeFileSync('./data/global/log.json', JSON.stringify(nmb.bot.log, null, 2), 'utf8')
    console.log(`* [BOT] Logs saved`)
  } else console.error(`* [BOT] Log undefined and not saved`)

  if (exitCode || exitCode === 0) console.error(exitCode)
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
