var tmi = require('tmi.js')
const fs = require('fs')

let msgHandler = require('./handlers/MsgHandler.js')
exports.msgHandler = msgHandler

var bot = {}
bot.global = require('./data/global/userstate.json')
exports.bot = bot

var opts = require('./config/TwitchClient.json')
var client = new tmi.Client(opts)

msgHandler.refer(client, bot, this)

client.connect()

client.on('message', msgHandler.receive)

client.on('notice', (channel, msgid, message) => {
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

client.on('timeout', (channel, username, reason, duration) => {
  if (username === client.username) {
    bot[channel].channel.timeout_end = Date.now() + duration * 1000
    console.log(bot[channel].channel.timeout_end)
  }
  console.log(`* [${channel}] ${username} timedout for ${duration} seconds (${reason})`)
})

client.on('ban', (channel, username, reason) => {
  if (username === client.username) {
    bot[channel].channel.banned = true
  }
  console.log(`* [${channel}] ${username} banned for ${reason}`)
})

client.on('mod', (channel, username) => {
  if (username === client.username) {
    bot[channel].channel.mod = true
  }
})

client.on('connecting', (address, port) => {
  console.log(`* connecting...`)
})

client.on('connected', (address, port) => {
  console.log(`* Connected`)
  joinChannel('#satsaa')
})

client.on('disconnected', (reason) => {
  console.log(`* Disconnected (${reason})`)
  process.exit(0)
})

client.on('reconnect', () => {
  console.log(`* Attempting to reconnect`)
})

let roomstateQueue = {} // {channel: roomstate}
client.on('roomstate', (channel, state) => {
  if (bot.hasOwnProperty(channel)) {
    // console.log(`* [${channel}] Roomstate: ${JSON.stringify(state)}`)
    for (let element in state) {
      bot[channel].roomstate[element] = state[element]
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
    client.join(channel).then((data) => { // data returns channel
      bot[channel] = {}
      fs.access('./data/' + channel + '/responses.json', fs.constants.F_OK, (err) => {
        console.log(`* [${channel}] Responses loaded`)
        if (!err) { // Load response file if its created. NO need to precreate it here
          bot[channel].responses = require('./data/' + channel + '/responses.json')
        }
        fs.access('./data/' + channel + '/roomstate.json', fs.constants.F_OK, (err) => {
          console.log(`* [${channel}] Roomstate loaded`)
          if (!err) { // Load response file if its created. NEED to precreate it here
            bot[channel].roomstate = require('./data/' + channel + '/roomstate.json')
          } else {
            fs.copyFile('./data/default/roomstate.json', './data/' + channel + '/roomstate.json', err => {
              if (err) throw err
              console.log(`* [${channel}] Roomstate file created`)
              bot[channel].roomstate = require('./data/' + channel + '/roomstate.json')
            })
          }
          fs.access('./data/' + channel + '/commands.json', fs.constants.F_OK, (err) => {
            console.log(`* [${channel}] Commands loaded`)
            if (!err) { // Load commands file if its created. NEED to precreate it here
              bot[channel].commands = require('./data/' + channel + '/commands.json')
            } else {
              fs.copyFile('./data/default/commands.json', './data/' + channel + '/commands.json', err => {
                if (err) throw err
                console.log(`* [${channel}] Commands file created`)
                bot[channel].commands = require('./data/' + channel + '/commands.json')
              })
            }
            console.log(`* [${channel}] Joined`)
            const dataPath = './data/' + channel + '/channel.json'
            fs.mkdir('./data/' + channel, {}, (err) => {
              if (err && err.code !== 'EEXIST') throw err
              fs.access(dataPath, fs.constants.F_OK, (err) => {
                if (err) { // create channel options
                  // console.log(`* [${channel}] Creating settings file`)
                  fs.copyFile('./data/default/channel.json', dataPath, err => {
                    if (err) throw err
                    console.log(`* [${channel}] Settings file created`)
                    loadSettings(channel, dataPath)
                  })
                } else {
                  loadSettings(channel, dataPath)
                }
              })
            })
          })
        })
      })
    }).catch((err) => {
      console.log(`* [${channel}] Error joining: ${err}`)
    })
  })
  // read channel settings file and json it in to bot{}
  function loadSettings (channel, dataPath) {
    fs.readFile(dataPath, 'utf8', (err, data) => { // data returns channel
      // console.log(`* [${channel}] Loading settings`)
      if (err) throw err
      bot[channel].channel = JSON.parse(data)
      console.log(`* [${channel}] Settings loaded`)
      if (roomstateQueue.hasOwnProperty(channel)) {
        for (let element in roomstateQueue[channel]) {
          bot[channel].roomstate[element] = roomstateQueue[channel][element]
        }
        console.log(`* [${channel}] Initial roomstate loaded`)
        delete roomstateQueue[channel]
      }
    })
  }
}
exports.joinChannel = joinChannel

function partChannel (channels) {
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
exports.partChannel = partChannel

function saveChannel (channels) {
  if (typeof channels === 'string') { // channels is used as an array but a single channel string is supported
    channels = [channels]
  }
  channels.forEach((channel) => {
    fs.writeFile('./data/' + channel + '/channel.json', JSON.stringify(bot[channel].channel, null, 2), 'utf8', (err) => {
      if (err) throw err
      console.log(`* [${channel}] Settings saved`)
    })
  })
}

let saveInterval
if (typeof bot.global.save_interval === 'undefined' || !(bot.global.save_interval === -1 || bot.global.save_interval > 0)) {
  console.log(`* [ERROR] data\\global\\userstate.json -> save_interval must be -1 (disabled) or positive`)
} else {
  saveInterval = setInterval(save, bot.global.save_interval * 1000)
} // created save interval

function save () {
  let channels = []
  for (var key in bot) {
    if (key.startsWith('#')) {
      channels.push(key)
    }
  }
  channels.forEach((channel) => {
    fs.writeFile('./data/' + channel + '/channel.json', JSON.stringify(bot[channel].channel, null, 2), 'utf8', (err) => {
      if (err) throw err
    })
  })
  console.log(`* [CHANNELS] Settings saved`)
  fs.writeFile('./data/global/userstate.json', JSON.stringify(bot.global, null, 2), 'utf8', (err) => {
    if (err) throw err
  })
  console.log(`* [BOT] Saved`)
}
