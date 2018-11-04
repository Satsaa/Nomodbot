var tmi = require('tmi.js')
const fs = require('fs')
const utilM = require('util')

let msgHandler = require('./handlers/MsgHandler.js')
exports.msgHandler = msgHandler

var bot = {}
bot.internal = require('./data/global/internal.json')
bot.config = require('./data/global/config.json')
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
  console.log((utilM.inspect(noModBot, { showHidden: false, depth: null })))
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
  noModBot.bot.startTime = Date.now()
  process.exit(0)
})

client.on('reconnect', () => {
  console.log(`* Attempting to reconnect`)
})

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
let roomstateQueue = {} // {channel: roomstate}
function loadRoomstateFromQueue (channel) {
  return new Promise((resolve, reject) => {
    if (roomstateQueue.hasOwnProperty(channel)) {
      if (!bot[channel].roomstate) {
        bot[channel].roomstate = {}
      }
      for (let element in roomstateQueue[channel]) {
        bot[channel].roomstate[element] = roomstateQueue[channel][element]
      }
      delete roomstateQueue[channel]
      resolve()
    }
    resolve()
  })
}

// Complexity is key
function joinChannel (channels) { // Allows multichannel
  return new Promise((resolve, reject) => {
    if (typeof channels === 'string') { // channels is used as an array but a single channel string is supported
      channels = [channels]
    }
    channels.forEach((channel) => {
      addChannel(channel)
      client.join(channel).then((data) => { // data returns channel
        bot[channel] = {}
        console.log(`* [${channel}] Joined`)
        fs.mkdir('./data/' + channel, {}, (err) => {
          if (err && err.code !== 'EEXIST') throw err
          loadChannelFile(channel, 'responses', true).then(
            loadChannelFile(channel, 'roomstate', true).then(
              loadChannelFile(channel, 'commands', true).then(
                loadChannelFile(channel, 'quotes', true).then(
                  loadChannelFile(channel, 'myiq', true).then(
                    loadChannelFile(channel, 'channel', true).finally(() => {
                      loadRoomstateFromQueue(channel).then(() => {
                        console.log(`* [${channel}] Initial roomstate loaded`)
                        resolve(channel)
                      })
                    })
                  )
                )
              )
            )
          )
        })
      }).catch((err) => {
        console.log(`* [${channel}] Error joining: ${err}`)
        removeChannel(channel)
        reject(err)
      })
    })

    function loadChannelFile (channel, fileName, copyDefault = false) {
      return new Promise((resolve, reject) => {
        const fileNamePath = './data/' + channel + '/' + fileName + '.json'
        fs.access(fileNamePath, fs.constants.F_OK, (err) => {
          if (err) { // doesnt exist already
            if (copyDefault) {
              fs.copyFile('./data/default/' + fileName + '.json', fileNamePath, err => {
                if (err) throw err
                bot[channel][fileName] = require(fileNamePath)
                console.log(`* [${channel}] ${fileName} created`)
                resolve()
              })
            } else {
              fs.writeFile(fileNamePath, '{}', (err) => {
                if (err) throw err
                console.log(`* [${channel}] ${fileName} created`)
                resolve()
              })
            }
          } else { // exists already
            bot[channel][fileName] = require(fileNamePath)
            console.log(`* [${channel}] ${fileName} loaded`)
            resolve()
          }
        })
      })
    }
  })
}
exports.joinChannel = joinChannel

function partChannel (channels) {
  return new Promise((resolve, reject) => {
    if (typeof channels === 'string') { // channels is used as an array but a single channel string is supported
      channels = [channels]
    }
    channels.forEach((channel) => {
      client.part(channel).then((data) => { // data returns parted channel
        console.log(`* [${channel}] Parted`)
        delete bot[channel]
        removeChannel(channel)
      }).catch((err) => {
        console.log(`* [${channel}] Error parting: ${err}`)
        addChannel(channel)
        reject(err)
      })
    })
    saveChannel(channels).then(() => {
      resolve()
    })
  })
}
exports.partChannel = partChannel

// add/remove channel on internal channels array
function addChannel (channel) {
  if (!(channel in bot.internal.channels)) {
    bot.internal.channels.push(channel)
  }
}
function removeChannel (channel) {
  let index = bot.internal.channels.indexOf(channel)
  if (index > -1) {
    bot.internal.channels.splice(index, 1)
  }
}

function saveChannel (channels) {
  return new Promise((resolve, reject) => {
    if (typeof channels === 'string') { // channels is used as an array but a single channel string is supported
      channels = [channels]
    }
    channels.forEach((channel) => {
      fs.writeFile('./data/' + channel + '/channel.json', JSON.stringify(bot[channel].channel, null, 2), 'utf8', (err) => {
        if (err) throw err
        console.log(`* [${channel}] Settings saved`)
        resolve(channel)
      })
    })
  })
}

let saveInterval
if (typeof bot.config.save_interval === 'undefined' || !(bot.config.save_interval === -1 || bot.config.save_interval > 0)) {
  console.log(`* [ERROR] .\\data\\global\\config.json -> save_interval must be -1 (disabled) or positive`)
} else if (bot.config.save) {
  saveInterval = setInterval(save, bot.config.save_interval * 1000)
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
  fs.writeFile('./data/global/internal.json', JSON.stringify(bot.internal, null, 2), 'utf8', (err) => {
    if (err) throw err
  })
  console.log(`* [BOT] Saved`)
}
