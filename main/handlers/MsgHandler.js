var cmdHandler = require('../handlers/cmdHandler.js')

module.exports.receive = (channel, userstate, message, self) => {
  // remove antiduplicate suffix, it would be counted as a parameter (mainly from chatterino)
  if (nmb.bot.config.console_log_messages) { // log messages in console
    console.log(`[${channel} (${userstate['message-type']})] ${userstate['display-name']}: ${message}`)
  }
  switch (userstate['message-type']) {
    case 'action':
    // TIME:a:USER:MSG
      if (self) nmb.logger.log(channel, 'action', userstate['display-name'], nmb.client.globaluserstate['user-id'], message)
      else nmb.logger.log(channel, 'action', userstate['display-name'], userstate['user-id'], message)
    // no break
    case 'chat':
      emitter.emit('message', channel, userstate, message, self)

      if (self) {
        updateBot(channel, userstate, message)
        // Remove 2 chars used on chatterino and this bot (default) since they cause issues with parameters
        if (message.endsWith(' \u206D')) message = message.substring(0, message.length - 2)
        if (userstate['message-type'] === 'chat') {
          nmb.logger.log(channel, 'message', userstate['display-name'], nmb.client.globaluserstate['user-id'], message)
        }
      } else {
        // Remove 2 chars used on chatterino and this bot (default) since they cause issues with parameters
        if (message.endsWith(' \u206D')) message = message.substring(0, message.length - 2)
        if (userstate['message-type'] === 'chat') {
          nmb.logger.log(channel, 'message', userstate['display-name'], userstate['user-id'], message)
        }
        const params = message.split(' ') // Split message to an array
        const commandName = params[0].toLowerCase() // Command name (first word)

        let command
        if (commandName.toLowerCase() === nmb.bot[channel].channel.help) {
          let commandName // Command name (second word)
          if (!params[1]) {
            chat(channel, 'Must define a command (param 1)')
          } else {
            commandName = params[1].toLowerCase()
            if (nmb.bot[channel].commands.hasOwnProperty(commandName)) { // command
              if (typeof nmb.bot[channel].commands[commandName] === 'object') {
                command = nmb.bot[channel].commands[commandName].command
              } else {
                command = nmb.bot[channel].commands[commandName]
              }
              cmdHandler.helpHandle(command, channel, params)
            } else if (nmb.bot[channel].responses.hasOwnProperty(commandName)) { // response
              chat(channel, `'${params[1]}' is a response command. Invoke it by typing '${params[1]}'`)
            } else { // unknown
              chat(channel, `'${params[1]}' doesn't seem to exist :(`)
            }
          }
        }

        if (nmb.bot[channel].commands.hasOwnProperty(commandName)) { // command
          if (typeof nmb.bot[channel].commands[commandName] === 'object') {
            if (nmb.bot[channel].commands[commandName].userlvl &&
                nmb.bot[channel].commands[commandName].userlvl === 'master') {
              if (!nmb.bot.config.masters.includes(userstate['username'])) return // not permitted
            }
            command = nmb.bot[channel].commands[commandName].command // object command type
          } else command = nmb.bot[channel].commands[commandName] // old string only type
          cmdHandler.handle(command, channel, userstate, params)
        } else {
          // emit for things like responses
          emitter.emit('nocommand', channel, commandName, params)
        }
      }
      break
    case 'whisper':
      if (!self) whisper(channel, message)
      console.log(`[${channel} (${userstate['message-type']})] ${userstate['display-name']}: ${message}`)
      break
    default:
      console.log(`[${channel} (${userstate['message-type']})] ${userstate['display-name']}: ${message}`)
      break
  }
}

function updateBot (channel, userstate, message) {
  if (message.length) nmb.bot[channel].channel.last_msg = message
  nmb.bot[channel].channel.banned = false
  nmb.bot[channel].channel.timeout_end = null
  if (nmb.bot[channel].channel.mod !== userstate.mod) {
    nmb.bot[channel].channel.mod = userstate.mod // false if broadcaster
    if (channel.endsWith(nmb.client.username)) nmb.bot[channel].channel.mod = true // broadcaster = mod
    if (nmb.bot[channel].channel.mod) console.log(`* [${channel}] Moderator granted`)
    else console.error(`* [${channel}] Moderator revoked`)
  }
  nmb.bot[channel].channel.subscriber = userstate.subscriber
}

module.exports.chat = chat
function chat (channels, msg, allowCommand) {
  if (typeof msg === 'number') msg = msg.toString()

  msg = msg.replace(/ +(?= )/g, '') // replace multiple spaces with a single space
  if (!allowCommand) {
    if (!msg.startsWith('/me ') && !msg.startsWith('.me ') && !msg.startsWith('\\me ')) { // allow /me
      if (msg.charAt(0) === '/' || msg.charAt(0) === '.' || msg.charAt(0) === '\\') {
        msg = ' ' + msg
      }
    }
  }
  if (!Array.isArray(channels) && typeof channels === 'object') {
    console.error(`[MESSAGEHANDLER] Invalid channels type: ${typeof channels} `)
    return
  }
  if (typeof channels === 'string') { // channels is used as an array but a single channel string is supported
    channels = [channels]
  }
  channels.forEach((channel) => {
    if (typeof nmb.bot[channel] === 'undefined') { // not joined
      if (nmb.bot.config.join_on_msg) { // Joining on msg enabled?
        nmb.joinChannel(channel).then((data) => {
          main()
        })
      }
    } else main()

    function main () { // just a block
      if (nmb.bot[channel].channel.mod) { // mod, no speed limit, max 100 per 30 sec tho
        parseTimes(1)
        if (nmb.bot.internal.mod_times.length >= nmb.bot.internal.mod_limit) { // if ratelimit is full
          queueModChat(channel, msg)
          return
        }
        parseSay(channel, msg)
      } else { // user needs limits
        queueChat(channel, msg)
      }
    }
  })
}

/**
 * Sends the message after removing things that can cause the msg to be rejected (too long, duplicate...)
 * @param {string} channel Channel to send to
 * @param {string} msg Message to be sent
 */
function parseSay (channel, msg) {
  return new Promise((resolve, reject) => {
    let short = nmb.bot[channel].channel
    // Prevent lengthy messages. (Note that actual max length may vary on Twitch' side)
    if (msg.length > short.max_length) {
      msg = msg.substring(0, short.max_length)
      msg = msg.slice(0, -3) + '...' // add ... to the end to make it clearer that msg was cut
      var dotted = true
    }

    // Anti duplication so messages wont be rejected as duplicates
    if (!short.last_msg.endsWith(short.dupe_affix)) {
      if (msg.length + short.dupe_affix.length > short.max_length) {
        if (dotted) {
          msg = msg.substr(0, msg.length - 3 - short.dupe_affix.length) + msg.substr(msg.length - 3)
        } else {
          msg = msg.substring(0, short.max_length - short.dupe_affix.length)
          msg = msg.slice(0, -3) + '...' // add ... to the end to make it clearer that msg was cut
        }
      }
      msg += short.dupe_affix
    }

    // Send and handle issues or non-issues
    nmb.client.say(channel, msg).then(() => {
      nmb.bot.internal.mod_times.push(Date.now())
      resolve()
    }).catch((err) => {
      console.error(`* [${channel}] Msg failed: ${err}`)
      reject(err)
    })
  })
}

function whisper (channel, message) {
  if (nmb.bot.internal.whisper_accounts.includes(channel)) {
    nmb.bot.internal.whisper_accounts.push(channel)
    if (nmb.bot.internal.whisper_accounts.length >= 40) { // implement account rate limiting in the future
      console.error(`* ${nmb.bot.internal.whisper_accounts.length} whisper accounts reached!`)
    }
  }
  queueWhisper(channel, message)
}

/*
client say() and whisper() promises:
1: There is no possible way to know if a message has been sent successfully unless we create two connections.
These promises will always be resolved unless you are trying to send a message and you’re not connected to server.
*/
let chatQueue = [] // [[channel, message],...]
function queueChat (channel, message) {
  chatQueue.push([channel, message])

  // console.log(`length ${chatQueue.length}`)
  if (chatQueue.length !== 1) return // return if queue is active

  setTimeout(() => { // send one message and init interval if needed afterwards
    nmb.bot.internal.user_times.push(Date.now())
    parseSay(chatQueue[0][0], chatQueue[0][1]).then(() => {
      chatQueue.shift()
    }).finally(() => {
      if (chatQueue.length) {
        let queueInteval = setInterval(() => { // send messages in intervals afterwards
          parseTimes()
          if (nmb.bot.internal.user_times.length >= nmb.bot.config.user_limit) return // Rate limiting
          nmb.bot.internal.user_times.push(Date.now())
          parseSay(chatQueue[0][0], chatQueue[0][1]).then(() => {
            chatQueue.shift()
          }).finally(() => { // remove message from queue recardles of outcome to prevent nasty loops
            if (!chatQueue.length) clearInterval(queueInteval)
          })
        }, nmb.bot.config.message_delay_ms)
      }
    })
  }, getTimeout())

  function getTimeout () {
    parseTimes()
    if (nmb.bot.internal.user_times.length >= nmb.bot.config.user_limit) {
      // (oldest_message_time + limit_period * 1000) - current time // ms until limit is not full anymore
      return (nmb.bot.internal.user_times[0] + nmb.bot.config.limit_period * 1000) - Date.now()
    }

    // current_time - last_msg_time > message_delay ? 0 : message_delay - (current_time - last_msg_time)
    return (Date.now() - nmb.bot.internal.user_times[nmb.bot.internal.user_times.length - 1] > nmb.bot.config.message_delay_ms)
      ? 0
      : (nmb.bot.config.message_delay_ms - (Date.now() - nmb.bot.internal.user_times[nmb.bot.internal.user_times.length - 1]))
  }
}

let modQueue = [] // [[channel, message],...]
function queueModChat (channel, message) {
  modQueue.push([channel, message])
  if (modQueue.length !== 1) return // return if queue is active

  setTimeout(timeoutMsg, getTimeout())

  function timeoutMsg () {
    parseSay(modQueue[0][0], modQueue[0][1]).then(() => {
      nmb.bot.internal.mod_times.push(Date.now())
      modQueue.shift()
    }).catch((err) => {
      console.error(`* [${modQueue[0][0]}] Msg failed: ${err}`)
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
    return (nmb.bot.internal.mod_times[0] + nmb.bot.config.limit_period * 1000) - Date.now() + 50 // + 50 so parse parsetimeout() removes the oldest time
  }
}

let whisperQueue = [] // [[channel, message],...]
function queueWhisper (channel, message) {
  whisperQueue.push([channel, message])
  if (whisperQueue.length !== 1) return // return if queue is active

  setTimeout(timeoutMsg, getTimeout())

  function timeoutMsg () {
    nmb.client.whisper(whisperQueue[0][0], whisperQueue[0][1]).then(() => {
      whisperQueue.shift()
      nmb.bot.internal.whisper_times_sec.push(Date.now())
      nmb.bot.internal.whisper_times_min.push(Date.now())
    }).catch((err) => {
      console.error(`* [${whisperQueue[0][0]}] Whisper failed: ${err}`)
    }).finally(() => {
      if (whisperQueue.length) { // continue queue
        setTimeout(timeoutMsg, getTimeout())
      }
    })
  }

  function getTimeout () {
    parseWhisperTimes()
    // (oldest_message_time + {1 or 60} * 1000) - current time // ms until limit is not full anymore // + 50 for parse func safety
    if (nmb.bot.internal.whisper_times_sec.length >= nmb.bot.config.whisper_limit_sec) return (nmb.bot.internal.whisper_times_sec[0] + 1 * 1000) - Date.now() + 50
    if (nmb.bot.internal.whisper_times_min.length >= nmb.bot.config.whisper_limit_min) return (nmb.bot.internal.whisper_times_min[0] + 60 * 1000) - Date.now() + 50
    return 0
  }
}

function antiDupe (channel, message) { // remove or add 2 chars at msg end to avoid duplicate messages
  if (nmb.bot[channel].channel.last_msg.endsWith(' \u206D')) {
    message.slice(-2)
    return message
  } else {
    return message + ' \u206D' // U+206D = ACTIVATE ARABIC FORM SHAPING // 0 width character
  }
}

function limitLength (msg, length = 499) {
  if (msg.length > length) {
    console.error(`* Msg shortened ${msg.length}. Max length was ${length}`)
    return msg.substring(0, length)
  } else return msg
}

// remove messages from time lists that exceed limit_period sec age
function parseTimes (mod = 0) {
  let time = Date.now()
  if (mod) {
    for (let i = 0; i < nmb.bot.internal.mod_times.length; i++) {
      if (nmb.bot.internal.mod_times[i] < time - nmb.bot.config.limit_period * 1000) { // mesages are counted for limit_period seconds
        nmb.bot.internal.mod_times.shift()
        i--
      } else break
    }
  } else {
    for (let i = 0; i < nmb.bot.internal.user_times.length; i++) {
      if (nmb.bot.internal.user_times[i] < time - nmb.bot.config.limit_period * 1000) { // mesages are counted for limit_period seconds
        nmb.bot.internal.user_times.shift()
        i--
      } else break
    }
  }
}

// remove messages from time lists that exceed 1/60 sec age
function parseWhisperTimes () {
  let time = Date.now()
  for (let i = 0; i < nmb.bot.internal.whisper_times_min.length; i++) {
    if (nmb.bot.internal.whisper_times_min[i] < time - 60 * 1000) { // whisper messages are counted for 60 second
      nmb.bot.internal.whisper_times_min.shift()
      i--
    } else break
  }
  for (let i = 0; i < nmb.bot.internal.whisper_times_sec.length; i++) {
    if (nmb.bot.internal.whisper_times_sec[i] < time - 1 * 1000) { // whisper messages are counted for 1 second too
      nmb.bot.internal.whisper_times_sec.shift()
      i--
    } else break
  }
}
