var tmi = require('tmi.js')

var commands = require('./commands/loader.js')

let msgHandler = require('./handlers/MsgHandler.js')

var opts = require('./config/TwitchClient.json')
var client = new tmi.Client(opts)
client.connect()

client.on('message', function (channel, userstate, message, self) {
  msgHandler.receive(channel, userstate, message, self, client)
})

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
  channels.forEach(function (channel) {
    client.join(channel).then(function (data) {
      console.log(`* Joined ${data}`)
    }).catch(function (err) {
      console.log(`Error while trying to join ${channel}: ${err}`)
    })
  })
}
