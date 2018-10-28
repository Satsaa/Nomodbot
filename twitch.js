var tmi = require('tmi.js')
const fs = require('fs')

let msgHandler = require('./handlers/MsgHandler.js')
exports.msgHandler = msgHandler

var bot = {}
bot.global = require('./data/global/userstate.json')

var opts = require('./config/TwitchClient.json')
var client = new tmi.Client(opts)

msgHandler.refer(client, bot, this)

client.connect()

client.on('message', msgHandler.receive)

client.on('notice', function (channel, msgid, message) {
  switch (msgid) {
    case 'msg_timedout':
      console.log(`* [${channel}] ${message}`)
      break
    case 'msg_ratelimit':
      console.log(`* [${channel}] ${message}`)
      break
    case 'msg_banned':
      console.log(`* [${channel}] ${message}`)
      break
    default:
      console.log(`* [${channel}] ${message}`)
      break
  }
})

client.on('timeout', function (channel, username, reason, duration) {
  if (username === client.username) {
    bot[channel].timeout_end = Date.now() + duration * 1000
    console.log(bot[channel].timeout_end)
  }
  console.log(`* [${channel}] ${username} timedout for ${duration} seconds (${reason})`)
})

client.on('ban', function (channel, username, reason) {
  if (username === client.username) {
    bot[channel].banned = true
  }
  console.log(`* [${channel}] ${username} banned for ${reason}`)
})

client.on('mod', function (channel, username) {
  if (username === client.username) {
    bot[channel].mod = true
  }
})

client.on('connecting', function (address, port) {
  console.log(`* connecting to ${address}:${port}`)
})

client.on('connected', function (address, port) {
  console.log(`* Connected to ${address}:${port}`)
  joinChannel('#satsaa')
})

client.on('disconnected', function (reason) {
  console.log(`* Disconnected (${reason})`)
  process.exit(0)
})

client.on('reconnect', function () {
  console.log(`* Attempting to reconnect`)
})

let roomstateQueue = {} // {channel: roomstate}
client.on('roomstate', (channel, state) => {
  if (bot.hasOwnProperty(channel)) {
    console.log(`* [${channel}] Roomstate: ${JSON.stringify(state)}`)
    for (let element in state) {
      bot[channel].roomstate[element] = element
    }
  } else {
    roomstateQueue[channel] = state
  }
})

function joinChannel (channels) { // Allows multichannel
  if (typeof channels === 'string') { // channels is used as an array but a single channel string is supported
    channels = [channels]
  }
  channels.forEach((channel) => {
    client.join(channel).then(function (data) { // data returns channel
      console.log(`* [${channel}] Joined`)
      // data\channel\settings\#satsaa.json
      const dataPath = './data/channel/settings/' + channel + '.json'
      fs.access(dataPath, fs.constants.F_OK, (err) => {
        if (err) { // create channel options
          // console.log(`* [${channel}] Creating settings file`)
          fs.copyFile('./data/channel/settings/default.json', dataPath, err => {
            if (err) throw err
            console.log(`* [${channel}] Settings file created`)
            loadSettings(channel, dataPath)
          })
        } else {
          loadSettings(channel, dataPath)
        }
      })
    }).catch(function (err) {
      console.log(`* [${channel}] Error joining: ${err}`)
    })
  })
  // read channel settings file and json it in to bot{}
  function loadSettings (channel, dataPath) {
    fs.readFile(dataPath, 'utf8', (err, data) => { // data returns channel
      // console.log(`* [${channel}] Loading settings`)
      if (err) throw err
      bot[channel] = JSON.parse(data)
      console.log(`* [${channel}] Settings loaded`)
      if (roomstateQueue.hasOwnProperty(channel)) {
        for (let element in roomstateQueue[channel]) {
          bot[channel].roomstate[element] = element
        }
        console.log(`* [${channel}] Initial roomstate loaded`)
        delete roomstateQueue[channel]
      }
    })
  }
}
exports.joinChannel = joinChannel

module.exports.partChannel = function partChannel (channels) {
  if (typeof channels === 'string') { // channels is used as an array but a single channel string is supported
    channels = [channels]
  }
  channels.forEach((channel) => {
    client.part(channel).then((data) => { // data returns parted channel
      console.log(`* [${channel}] Parted`)
    }).catch((err) => {
      console.log(`* [${channel}] Error parting: ${err}`)
    })
  })
  saveChannel(channels)
}
// module.exports.partChannel = partChannel

function saveChannel (channels) {
  if (typeof channels === 'string') { // channels is used as an array but a single channel string is supported
    channels = [channels]
  }
  channels.forEach((channel) => {
    fs.writeFile('./data/channel/settings/' + channel + '.json', JSON.stringify(bot[channel], null, 2), 'utf8', (err) => {
      if (err) throw err
      console.log(`* [${channel}] Settings saved`)
    })
  })
}
