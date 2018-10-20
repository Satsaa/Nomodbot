var tmi = require('tmi.js')

var opts = require('.config/TwitchClient.json')

let client = new tmi.Client(opts)

client.on('message', function (channel, userstate, message, self) {
  // Don't listen to my own messages..
  if (self) return

  // Handle different message types..
  switch (userstate['message-type']) {
    case 'action':
      // This is an action message..
      break
    case 'chat':
      // This is a chat message..
      break
    case 'whisper':
      // This is a whisper..
      break
    default:
      // Something else ?
      break
  }
})

client.on('timeout', function (channel, username, reason, duration) {
  // Do your stuff.
})

client.on('notice', function (channel, msgid, message) {
  switch (msgid) {
    case 'msg_timedout':
      console.log(`message`)
      break
    case 'msg_ratelimit':
      console.log(`message`)
      break
    case 'msg_emoteonly':
      console.log(`message`)
      break
    case 'msg_subsonly':
      console.log(`message`)
      break
    case 'emote_only_off':
      console.log(`message`)
      break
    case 'emote_only_on':
      console.log(`message`)
      break
    case 'msg_banned':
      console.log(`message`)
      break
    default:
      console.log(`message`)
      break
  }
})

client.on('ban', function (channel, username, reason) {
  console.log(`* [${channel}] ${username} banned for ${reason}`)
})

client.on('connected', function (address, port) {
  console.log(`* Connected to ${address}:${port}`)
})

client.on('connecting', function (address, port) {
  console.log(`* connecting to ${address}:${port}`)
})

client.on('disconnected', function (reason) {
  console.log(`* Disconnected (${reason})`)
})

client.on('reconnect', function () {
  console.log(`* Attempting to reconnect`)
})

client.on('roomstate', function (channel, state) {
  console.log(`* [${channel}] Roomstate: ${state}`)
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
