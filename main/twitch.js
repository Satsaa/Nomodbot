var tmi = require('./tmi.js')
const fs = require('fs')
const util = require('util')

var bot = {}
bot.startTime = Date.now()
bot.internal = require('../data/global/internal.json')

bot.log = requireCreate('./data/global/log.json')
bot.config = require('../data/global/config.json')
exports.bot = bot

var opts = require('../keyConfig/TwitchClient.json')
var client = new tmi.Client(opts)
exports.client = client

let msgHandler = require('./handlers/msgHandler.js')
exports.msgHandler = msgHandler

let logger = require('./handlers/logger.js')
exports.logger = logger

var checkDefaults = require('./handlers/defaultHandler.js')
exports.checkDefaults = checkDefaults

client.connect()

function requireCreate (path, data = '{}') {
  path = require('path').resolve(path)
  if (!fs.existsSync(path)) {
    fs.writeFileSync(path, data)
  }
  return require(path)
}

//  'message': 'c',
//  'action': 'a',
//  'sub': 's',
//  'gift': 'g',
//  'massgift': 'm',
//  'timeout': 't',
//  'ban': 'b',
//  'mod': 'u'
//  'unmod': 'd'

client.on('message', msgHandler.receive)
client.on('subscription', (channel, username, plan, msg, userstate) => {
  // TIME:s:USER:MONTHS:MSG
})
client.on('resub', (channel, username, months, msg, userstate, plan) => {
  // TIME:s:USER:MONTHS:MSG
})
client.on('subgift', (channel, username, recipient, plan, userstate) => {
  // TIME:g:USER:GIFTED
})
client.on('massgift', (channel, username, giftCount, plan, senderCount, userstate) => {
  // TIME:m:USER:COUNT
})
client.on('giftpaidupgrade', (channel, username, plan, promo, total, sender, userstate) => {
  // TIME:m:USER:PROMO
})
client.on('timeout', (channel, username, reason, duration) => {
  if (!bot[channel]) return
  // TIME:t:USER:DURATION:REASON
  let old = nmb.client
  nmb.client = 'HIDDEN'
  // console.log((util.inspect(nmb, { showHidden: false, depth: null })))
  nmb.client = old
  if (username === client.username) {
    bot[channel].channel.timeout_end = Date.now() + duration * 1000
    console.error(`* [${channel}] Bot has been timeouted for ${bot[channel].channel.timeout_end} seconds`)
  }
})

client.on('ban', (channel, username, reason) => {
  // TIME:b:USER:REASON
  if (bot[channel] && username === client.username) {
    bot[channel].channel.banned = true
    console.error(`* [${channel}] Bot banned for ${reason}`)
  } else console.log(`* [${channel}] ${username} banned for ${reason}`)
})

client.on('mod', (channel, username) => { // batched
  // console.log(`* [${channel}] ${username} modded`)
  // TIME:u:USER
  if (bot[channel] && username === client.username) {
    bot[channel].channel.mod = true
  }
})

client.on('unmod', function (channel, username) { // batched
  // console.log(`* [${channel}] ${username} unmodded`)
  // TIME:d:USER
  if (bot[channel] && username === client.username) {
    bot[channel].channel.mod = false
  }
})

client.on('notice', (channel, msgid, message) => {
  switch (msgid) {
    case 'msg_timedout':
      console.warn(`* [${channel}] ${message}`)
      break
    case 'msg_ratelimit':
      console.warn(`* [${channel}] ${message}`)
      break
    case 'msg_banned':
      console.warn(`* [${channel}] ${message}`)
      break
    default:
      console.warn(`* [${channel}] ${msgid}: ${message}`)
      break
  }
})

client.on('join', function (channel, username, self) {
  // console.log(`* [${channel} (join)] ${username}`)
})

client.on('part', function (channel, username, self) {
  // console.log(`* [${channel} (part)] ${username}`)
})

client.on('connecting', (address, port) => {
  console.log(`* connecting...`)
})

client.on('connected', (address, port) => {
  nmb.bot.startTime = Date.now()
  console.log(`* Connected`)
  joinChannel(bot.internal.channels).catch((err) => {
    if (err) console.error(`failed on 'Connected': ${err}`)
  })
})

client.on('disconnected', (reason) => {
  console.error(`* Disconnected (${reason})`)
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
    }
    resolve()
  })
}

// Complexity is key
exports.joinChannel = joinChannel
function joinChannel (channels) { // Allows multichannel
  return new Promise((resolve, reject) => {
    if (typeof channels === 'string') { // channels is used as an array but a single channel string is supported
      channels = [channels]
    }
    channels.forEach((channel) => {
      addChannel(channel)
      bot[channel] = {}

      getUserId(channel).catch((err) => {
        console.error(`* [ERROR (${channel})] Failed to get user ID: ${err}`)
      })
      fs.mkdir('./data/' + channel, {}, (err) => {
        if (err && err.code !== 'EEXIST') throw err
        loadChannelFile(channel, 'responses', true).then(
          loadChannelFile(channel, 'log', true).then(() => {
            if (!nmb.bot.log[channel]) {
              nmb.bot.log[channel] = {
                'offset': 0,
                'messages': 0,
                'users': 0,
                'start_time': null,
                'end_time': null
              }
            }
            loadChannelFile(channel, 'roomstate', true).then(
              loadChannelFile(channel, 'commands', false).then(
                loadChannelFile(channel, 'commandData', false).then(
                  loadChannelFile(channel, 'quotes', true).then(
                    loadChannelFile(channel, 'myiq', true).then(
                      loadChannelFile(channel, 'notifys', true).then(
                        loadChannelFile(channel, 'giveaway', true).then(
                          loadChannelFile(channel, 'channel', true).finally(() => {
                            loadRoomstateFromQueue(channel).then(() => {
                              console.log(`* [${channel}] Loaded`)
                              client.join(channel).then((data) => { // data returns channel
                                checkDefaults(channel)
                                console.log(`* [${channel}] Joined`)
                                emitter.emit('joinChannel', channel)
                                resolve(channel)
                              }).catch((err) => {
                                console.error(`* [${channel}] Error joining: ${err}`)
                                removeChannel(channel)
                                reject(err)
                              })
                            })
                          })
                        )
                      )
                    )
                  )
                )
              )
            )
          })
        )
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
                bot[channel][fileName] = require('.' + fileNamePath)
                console.log(`* [${channel}] ${fileName} created`)
                resolve(true)
              })
            } else {
              fs.writeFile(fileNamePath, '{}', (err) => {
                if (err) throw err
                bot[channel][fileName] = {}
                console.log(`* [${channel}] ${fileName} created`)
                resolve(true)
              })
            }
          } else { // exists already
            bot[channel][fileName] = require('.' + fileNamePath)
            // console.log(`* [${channel}] ${fileName} loaded`)
            resolve(false)
          }
        })
      })
    }
  })
}

exports.partChannel = partChannel
function partChannel (channels) {
  return new Promise((resolve, reject) => {
    if (typeof channels === 'string') { // channels is used as an array but a single channel string is supported
      channels = [channels]
    }
    channels.forEach((channel) => {
      client.part(channel).then((data) => { // data returns parted channel
        console.log(`* [${channel}] Parted`)
        if (typeof bot[channel] === 'undefined' || typeof bot[channel].channel === 'undefined') return
        fs.writeFile('./data/' + channel + '/channel.json', JSON.stringify(bot[channel].channel, null, 2), 'utf8', (err) => {
          if (err) throw err
          console.log(`* [${channel}] Channel saved`)
          delete bot[channel]
        })
        removeChannel(channel)
        emitter.emit('partChannel', channel)
        resolve()
      }).catch((err) => {
        console.error(`* [${channel}] Error parting: ${err}`)
        addChannel(channel)
        reject(err)
      })
    })
  })
}

// gets user id from cache or gathers it from api
exports.getUserId = getUserId
function getUserId (loginName) {
  return new Promise((resolve, reject) => {
    loginName = loginName.toLowerCase()
    if (loginName.length > 2) {
      // console.log(`* [${loginName}] Getting user id`)
      if (!loginName.startsWith('#')) loginName = '#' + loginName
      if (loginName in bot.internal.user_ids) {
        // console.log(`* [${loginName}] Using cached user id: ${bot.internal.user_ids[loginName]}`)

        resolve(bot.internal.user_ids[loginName])
      } else {
        nmb.client.api({
          url: 'https://api.twitch.tv/kraken/users?login=' + loginName.replace('#', ''),
          method: 'GET',
          headers: {
            'Client-ID': opts.options.clientId,
            'Accept': 'application/vnd.twitchtv.v5+json'
          }
        }, (err, res, data) => {
          if (err) reject(err)
          if ((((data || {}).users || {})[0] || {})._id) {
            // console.log(data)
            bot.internal.user_ids[loginName] = data.users[0]._id
            console.log(`* [${loginName}] Cached user id: ${data.users[0]._id}`)
            resolve(data.users[0]._id)
          } else reject(new Error('Invalid request'))
        })
      }
    }
  })
}

// add/remove channel on internal channels array
function addChannel (channel) {
  if (!(bot.internal.channels.includes(channel))) {
    bot.internal.channels.push(channel)
  }
}
function removeChannel (channel) {
  let index = bot.internal.channels.indexOf(channel)
  if (index > -1) {
    bot.internal.channels.splice(index, 1)
  }
}

let saveInterval
if (typeof bot.config.save_interval === 'undefined' || !(bot.config.save_interval === -1 || bot.config.save_interval > 0)) {
  console.error(`* [CONFIG] .\\data\\global\\config.json -> save_interval must be -1 (disabled) or positive`)
} else if (bot.config.save) {
  saveInterval = setInterval(save, bot.config.save_interval * 1000)
} // created save interval

exports.save = save
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
    else console.log(`* [BOT] Internals saved`)
  })
  emitter.emit('onsave')
}
