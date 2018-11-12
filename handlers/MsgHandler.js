var cmdHandler = require('../handlers/CmdHandler.js')

let twitch = {}
let client = {}
let bot = {}
module.exports.refer = (clientRef, botRef, twitchRef) => {
  client = clientRef
  bot = botRef
  twitch = twitchRef
}

module.exports.receive = (channel, userstate, message, self) => {
  // remove antiduplicate suffix, it would be counted as a parameter (mainly chatterino)
  if (message.endsWith(' \u206D')) message = message.substring(0, message.length - 2)
  switch (userstate['message-type']) {
    case 'action':
    case 'chat':
      if (self) updateBot(channel, userstate, message)
      else {
        // console.log(`[${channel} (${userstate['message-type']})] ${userstate['display-name']}: ${message}`)

        const params = message.split(' ') // Split message to an array
        const commandName = params[0].toLowerCase() // Command name (first word)

        let command
        if (commandName.toLowerCase() === bot[channel].channel.help) {
          const commandName = params[1].toLowerCase() // Command name (second word)
          if (!params[1]) {
            chat(channel, 'Must define a command (param 1)')
          } else {
            if (bot[channel].commands.hasOwnProperty(commandName)) { // command
              if (typeof bot[channel].commands[commandName] === 'object') {
                command = bot[channel].commands[commandName].command
              } else {
                command = bot[channel].commands[commandName]
              }
              cmdHandler.helpHandle(command, channel, params)
            } else if (bot[channel].responses.hasOwnProperty(commandName)) { // response
              chat(channel, `'${params[1]}' is a response command. Invoke it by typing '${params[1]}'`)
            } else { // unknown
              chat(channel, `'${params[1]}' doesn't seem to exist :(`)
            }
          }
        }

        if (bot[channel].commands.hasOwnProperty(commandName)) { // command
          if (typeof bot[channel].commands[commandName] === 'object') {
            if (bot[channel].commands[commandName].userlvl &&
                bot[channel].commands[commandName].userlvl === 'master') {
              if (!bot.config.masters.includes(userstate['username'])) return // not permitted
            }
            command = bot[channel].commands[commandName].command // object command type
          } else command = bot[channel].commands[commandName] // old string only type
          cmdHandler.handle(command, channel, userstate, params)
        } else {
          if (bot[channel].responses.hasOwnProperty(commandName)) { // response
            let text = bot[channel].responses[commandName]
            cmdHandler.responseHandle(text, channel, userstate, params)
          }
        }
      }
      break
    case 'whisper':
      if (!self) {
        whisper(channel, message)
      }
      console.log(`[${channel} (${userstate['message-type']})] ${userstate['display-name']}: ${message}`)
      break
    default:
      console.log(`[${channel} (${userstate['message-type']})] ${userstate['display-name']}: ${message}`)
      break
  }
}

function updateBot (channel, userstate, message) {
  if (message.length) { bot[channel].channel.last_msg = message }
  bot[channel].channel.banned = false
  bot[channel].channel.timeout_end = null
  if (bot[channel].channel.mod !== userstate.mod) {
    bot[channel].channel.mod = userstate.mod // false if broadcaster
    if (channel.endsWith(client.username)) { bot[channel].channel.mod = true } // broadcaster = mod
    if (bot[channel].channel.mod) console.log(`* [${channel}] Moderator granted`)
    else console.log(`* [${channel}] Moderator revoked`)
  }
  bot[channel].channel.subscriber = userstate.subscriber
}

module.exports.chat = chat
function chat (channels, msg, allowCommand) {
  if (!allowCommand) {
    if (!msg.startsWith('/me') && !msg.startsWith('.me') && !msg.startsWith('\\me')) { // allow /me
      if (msg.charAt(0) === '/' || msg.charAt(0) === '.' || msg.charAt(0) === '\\') {
        msg = ' ' + msg
      }
    }
  }
  if (typeof msg === 'number') {
    msg = msg.toString()
  }
  if (!Array.isArray(channels) && typeof channels === 'object') {
    console.log(`[ERROR] Invalid channels type: ${typeof channels} `)
    return
  }
  if (typeof channels === 'string') { // channels is used as an array but a single channel string is supported
    channels = [channels]
  }
  channels.forEach((channel) => {
    if (typeof bot[channel] === 'undefined') { // not joined
      if (nmb.bot.config.join_on_msg) { // Joining on msg enabled?
        nmb.joinChannel(channel).then((data) => {
          main()
        })
      }
    } else main()

    function main () { // just a block
      if (bot[channel].channel.mod) { // mod, no speed limit, max 100 per 30 sec tho
        parseTimes(1)
        if (bot.internal.mod_times.length >= bot.internal.mod_limit) { // if ratelimit is full
          queueModChat(channel, msg)
          return
        }
        client.say(channel, antiDupe(channel, msg)).then(() => {
          bot.internal.mod_times.push(Date.now())
        }).catch((err) => {
          console.log(`* [${channel}] Msg failed: ${err}`)
        })
      } else { // user needs limits
        queueChat(channel, msg)
      }
    }
  })
}

function whisper (channel, message) {
  if (bot.internal.whisper_accounts.includes(channel)) {
    bot.internal.whisper_accounts.push(channel)
    if (bot.internal.whisper_accounts.length >= 40) { // implement account rate limiting in the future
      console.log(`* ${bot.internal.whisper_accounts.length} whisper accounts reached!`)
    }
  }
  queueWhisper(channel, message)
}

/*
client.say and client.whisper:
1: There is no possible way to know if a message has been sent successfully unless we create two connections.
These promises will always be resolved unless you are trying to send a message and you’re not connected to server.
*/
let chatQueue = [] // [[channel, message],...]
function queueChat (channel, message) {
  chatQueue.push([channel, message])

  // console.log(`length ${chatQueue.length}`)
  if (chatQueue.length !== 1) return // return if queue is active

  setTimeout(() => { // send one message and init interval if needed afterwards
    bot.internal.user_times.push(Date.now())
    client.say(chatQueue[0][0], antiDupe(channel, chatQueue[0][1])).then(() => {
      chatQueue.shift()
    }).catch((err) => {
      console.log(`* [${chatQueue[0][0]}] Msg failed: ${err}`)
    }).finally(() => {
      if (chatQueue.length) {
        let queueInteval = setInterval(() => { // send messages in intervals afterwards
          parseTimes()
          if (bot.internal.user_times.length >= bot.config.user_limit) return // Rate limiting
          bot.internal.user_times.push(Date.now())
          client.say(chatQueue[0][0], antiDupe(channel, chatQueue[0][1])).then(() => {
            chatQueue.shift()
          }).catch((err) => {
            console.log(`* [${chatQueue[0][0]}] Msg failed: ${err}`)
          }).finally(() => {
            if (!chatQueue.length) clearInterval(queueInteval)
          })
        }, bot.config.message_delay_ms)
      }
    })
  }, getTimeout())

  function getTimeout () {
    parseTimes()
    if (bot.internal.user_times.length >= bot.config.user_limit) {
      // (oldest_message_time + limit_period * 1000) - current time // ms until limit is not full anymore
      return (bot.internal.user_times[0] + bot.config.limit_period * 1000) - Date.now()
    }

    // current_time - last_msg_time > message_delay ? 0 : message_delay - (current_time - last_msg_time)
    return (Date.now() - bot.internal.user_times[bot.internal.user_times.length - 1] > bot.config.message_delay_ms)
      ? 0
      : (bot.config.message_delay_ms - (Date.now() - bot.internal.user_times[bot.internal.user_times.length - 1]))
  }
}

let modQueue = [] // [[channel, message],...]
function queueModChat (channel, message) {
  modQueue.push([channel, message])
  if (modQueue.length !== 1) return // return if queue is active

  setTimeout(timeoutMsg, getTimeout())

  function timeoutMsg () {
    client.say(modQueue[0][0], antiDupe(channel, modQueue[0][1])).then(() => {
      bot.internal.mod_times.push(Date.now())
      modQueue.shift()
    }).catch((err) => {
      console.log(`* [${modQueue[0][0]}] Msg failed: ${err}`)
    }).finally(() => {
      parseTimes(1)
      if (modQueue.length) { // continue queue
        setTimeout(timeoutMsg, getTimeout())
      }
    })
  }

  function getTimeout () {
    parseTimes(1)
    // (oldest_message_time + bot.config.limit_period * 1000) - current time // ms until limit is not full anymore
    return (bot.internal.mod_times[0] + bot.config.limit_period * 1000) - Date.now() + 50 // + 50 so parse parsetimeout() removes the oldest time
  }
}

let whisperQueue = [] // [[channel, message],...]
function queueWhisper (channel, message) {
  whisperQueue.push([channel, message])
  if (whisperQueue.length !== 1) return // return if queue is active

  setTimeout(timeoutMsg, getTimeout())

  function timeoutMsg () {
    client.whisper(whisperQueue[0][0], whisperQueue[0][1]).then(() => {
      whisperQueue.shift()
      bot.internal.whisper_times_sec.push(Date.now())
      bot.internal.whisper_times_min.push(Date.now())
    }).catch((err) => {
      console.log(`* [${whisperQueue[0][0]}] Whisper failed: ${err}`)
    }).finally(() => {
      if (whisperQueue.length) { // continue queue
        setTimeout(timeoutMsg, getTimeout())
      }
    })
  }

  function getTimeout () {
    parseWhisperTimes()
    // (oldest_message_time + {1 or 60} * 1000) - current time // ms until limit is not full anymore // + 50 for parse func safety
    if (bot.internal.whisper_times_sec.length >= bot.config.whisper_limit_sec) return (bot.internal.whisper_times_sec[0] + 1 * 1000) - Date.now() + 50
    if (bot.internal.whisper_times_min.length >= bot.config.whisper_limit_min) return (bot.internal.whisper_times_min[0] + 60 * 1000) - Date.now() + 50
    return 0
  }
}

function antiDupe (channel, message) { // remove or add 2 chars at msg end to avoid duplicate messages
  if (bot[channel].channel.last_msg.endsWith(' \u206D')) {
    message.slice(-2)
    return message
  } else {
    return message + ' \u206D' // U+206D = ACTIVATE ARABIC FORM SHAPING // 0 width character
  }
}

// remove messages from time lists that exceed limit_period sec age
function parseTimes (mod = 0) {
  let time = Date.now()
  if (mod) {
    for (let i = 0; i < bot.internal.mod_times.length; i++) {
      if (bot.internal.mod_times[i] < time - bot.config.limit_period * 1000) { // mesages are counted for limit_period seconds
        bot.internal.mod_times.shift()
        i--
      } else break
    }
  } else {
    for (let i = 0; i < bot.internal.user_times.length; i++) {
      if (bot.internal.user_times[i] < time - bot.config.limit_period * 1000) { // mesages are counted for limit_period seconds
        bot.internal.user_times.shift()
        i--
      } else break
    }
  }
}

// remove messages from time lists that exceed 1/60 sec age
function parseWhisperTimes () {
  let time = Date.now()
  for (let i = 0; i < bot.internal.whisper_times_min.length; i++) {
    if (bot.internal.whisper_times_min[i] < time - 60 * 1000) { // whisper messages are counted for 60 second
      bot.internal.whisper_times_min.shift()
      i--
    } else break
  }
  for (let i = 0; i < bot.internal.whisper_times_sec.length; i++) {
    if (bot.internal.whisper_times_sec[i] < time - 1 * 1000) { // whisper messages are counted for 1 second too
      bot.internal.whisper_times_sec.shift()
      i--
    } else break
  }
}
