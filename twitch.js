var tmi = require('tmi.js')
const fs = require('fs')
var commands = require('./commands/loader.js')

let msgHandler = require('./handlers/MsgHandler.js')
var bot = {}
bot.global = require('./data/chat/global.json')
var opts = require('./config/TwitchClient.json')
var client = new tmi.Client(opts)
msgHandler.refer(client, bot)
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
    case 'msg_emoteonly':
      console.log(`* [${channel}] ${message}`)
      break
    case 'msg_subsonly':
      console.log(`* [${channel}] ${message}`)
      break
    case 'emote_only_off':
      console.log(`* [${channel}] ${message}`)
      break
    case 'emote_only_on':
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
  console.log(`* [${channel}] ${username} timedout for ${duration} seconds (${reason})`)
  process.exit(1)
})

client.on('ban', function (channel, username, reason) {
  console.log(`* [${channel}] ${username} banned for ${reason}`)
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

client.on('roomstate', function (channel, state) {
  console.log(`* [${channel}] Roomstate: ${JSON.stringify(state)}`)
})

client.on('emoteonly', function (channel, enabled) {
  partChannel('#satsaa')
  if (enabled) {
    console.log(`* [${channel}] Emoteonly turned ON`)
  } else {
    console.log(`* [${channel}] Emoteonly turned OFF`)
  }
})

client.on('slowmode', function (channel, enabled, length) {
  if (enabled) {
    console.log(`* [${channel}] Slowmode turned ON (${length} sec)`)
  } else {
    console.log(`* [${channel}] Slowmode turned OFF`)
  }
})

client.on('subscribers', function (channel, enabled) {
  if (enabled) {
    console.log(`* [${channel}] Subscribers mode turned ON`)
  } else {
    console.log(`* [${channel}] Subscribers mode turned OFF`)
  }
})

function joinChannel (channels) { // Allows multichannel
  if (typeof channels === 'string') { // channels is used as an array but a single channel string is supported
    channels = [channels]
  }
  channels.forEach((channel) => {
    client.join(channel).then(function (data) { // data is roomstate
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
    })
  }
}

function partChannel (channels) {
  if (typeof channels === 'string') { // channels is used as an array but a single channel string is supported
    channels = [channels]
  }
  channels.forEach((channel) => {
    client.part(channel).then((data) => { // data returns parted channel
      console.log(`* [${channel}] Parted`)
    }).catch((err) => {
      console.log(`* [${channel}] Error parting: ${err}`)
    }).finally(() => {
      saveChannel(channel)
    })
  })
}

function saveChannel (channel) {
  fs.writeFile('./data/channel/settings/' + channel + '.json', JSON.stringify(bot[channel], null, 2), 'utf8', (err) => {
    if (err) throw err
    console.log(`* [${channel}] Settings saved`)
  })
}
