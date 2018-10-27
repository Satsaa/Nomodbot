var client = {}
var bot = {}
module.exports.refer = (clientRef, botRef) => {
  client = clientRef
  bot = botRef
}

module.exports.receive = (channel, userstate, message, self) => {
  switch (userstate['message-type']) {
    case 'action':
      console.log(`[${channel} (${userstate['message-type']})] ${userstate['display-name']}: ${message}`)
      break
    case 'chat':
      if (self) updateBot(channel, userstate, message)
      // console.log(`[${channel} (${userstate['message-type']})] ${userstate["display-name"]}: ${message}`)
      if (!self) {
        chat(channel, message)
      }
      break
    case 'whisper':
      if (!self) {
        whisper(channel, message)
      }
      // console.log(`[${channel} (${userstate['message-type']})] ${userstate['display-name']}: ${message}`)
      break
    default:
      console.log(`[${channel} (${userstate['message-type']})] ${userstate['display-name']}: ${message}`)
      break
  }
}

function updateBot (channel, userstate, message) {
  if (message.length) { bot[channel].last_msg = message }
  bot[channel].banned = false
  bot[channel].timeout_end = null
  bot[channel].mod = userstate.mod // false if broadcaster
  if (channel.endsWith(client.username)) { bot[channel].mod = true } // broadcaster = mod
  bot[channel].subscriber = userstate.subscriber
  console.log(`* [${channel}] updated bot obj`)
}

function whisper (channel, message) {
  if (bot.global.whisper_accounts.includes(channel)) {
    bot.global.whisper_accounts.push(channel)
    if (bot.global.whisper_accounts.length >= 40) { // implement account rate limiting in the future
      console.log(`* ${bot.global.whisper_accounts.length} whisper accounts reached!`)
    }
  }
  queueWhisper(channel, message)
}

let whisperQueue = [] // [[channel, message],...]
function queueWhisper (channel, message) {
  whisperQueue.push([channel, message])
  if (whisperQueue.length !== 1) return // return if queue is active

  setTimeout(timeoutMsg, getTimeout())

  function timeoutMsg () {
    client.whisper(whisperQueue[0][0], whisperQueue[0][1]).then(() => {
      whisperQueue.shift()
      bot.global.whisper_times_sec.push(Date.now())
      bot.global.whisper_times_min.push(Date.now())
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
    // (oldest_message_time + 1/60 * 1000) - current time // ms until limit is not full anymore // + 50 for parse func safety
    if (bot.global.whisper_times_sec.length >= bot.global.whisper_limit_sec) return (bot.global.whisper_times_sec[0] + 1 * 1000) - Date.now() + 50
    if (bot.global.whisper_times_min.length >= bot.global.whisper_limit_min) return (bot.global.whisper_times_min[0] + 60 * 1000) - Date.now() + 50
    return 0
  }
}

function chat (channel, message) {
  if (bot[channel].mod) { // mod, no speed limit, max 100 per 30 sec tho
    parseTimes(1)
    if (bot.global.mod_times.length >= bot.global.mod_limit) { // if ratelimit is full
      queueModChat(channel, message)
      return
    }
    client.say(channel, antiDupe(channel, message)).then(() => {
      bot.global.mod_times.push(Date.now())
    }).catch((err) => {
      console.log(`* [${channel}] Msg failed: ${err}`)
    })
  } else { // user needs limits
    if (bot[channel].antiDuplicate) { // add character to avoid duplicate messages
      message = message + '\u206D' // U+206D = ACTIVATE ARABIC FORM SHAPING // invisible character
    }
    queueChat(channel, message)
  }
}

function antiDupe (channel, message) { // remove or add 2 chars at msg end to avoid duplicate messages
  if (bot[channel].last_msg.endsWith(' \u206D')) {
    message.slice(-2)
    return message
  } else {
    return message + ' \u206D' // U+206D = ACTIVATE ARABIC FORM SHAPING // invisible character
  }
}

let modQueue = [] // [[channel, message],...]
function queueModChat (channel, message) {
  modQueue.push([channel, message])
  if (modQueue.length !== 1) return // return if queue is active

  setTimeout(timeoutMsg, getTimeout())

  function timeoutMsg () {
    client.say(modQueue[0][0], antiDupe(channel, modQueue[0][1])).then(() => {
      bot.global.mod_times.push(Date.now())
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
    // (oldest_message_time + bot.global.limit_period * 1000) - current time // ms until limit is not full anymore
    return (bot.global.mod_times[0] + bot.global.limit_period * 1000) - Date.now() + 50 // + 50 so parse parsetimeout() removes the oldest time
  }
}

let chatQueue = [] // [[channel, message],...]
function queueChat (channel, message) {
  chatQueue.push([channel, message])

  // console.log(`length ${chatQueue.length}`)
  if (chatQueue.length !== 1) return // return if queue is active

  setTimeout(() => { // send one message and init interval if needed afterwards
    bot.global.user_times.push(Date.now())
    client.say(chatQueue[0][0], antiDupe(channel, chatQueue[0][1])).then(() => {
      chatQueue.shift()
    }).catch((err) => {
      console.log(`* [${chatQueue[0][0]}] Msg failed: ${err}`)
    }).finally(() => {
      if (chatQueue.length) {
        let queueInteval = setInterval(() => { // send messages in intervals afterwards
          parseTimes()
          if (bot.global.user_times.length >= bot.global.user_limit) return // Rate limiting
          bot.global.user_times.push(Date.now())
          client.say(chatQueue[0][0], antiDupe(channel, chatQueue[0][1])).then(() => {
            chatQueue.shift()
          }).catch((err) => {
            console.log(`* [${chatQueue[0][0]}] Msg failed: ${err}`)
          }).finally(() => {
            if (!chatQueue.length) clearInterval(queueInteval)
          })
        }, bot.global.message_delay_ms)
      }
    })
  }, getTimeout())

  function getTimeout () {
    parseTimes()
    if (bot.global.user_times.length >= bot.global.user_limit) {
      // (oldest_message_time + limit_period * 1000) - current time // ms until limit is not full anymore
      return (bot.global.user_times[0] + bot.global.limit_period * 1000) - Date.now()
    }

    // current_time - last_msg_time > message_delay ? 0 : message_delay - (current_time - last_msg_time)
    return (Date.now() - bot.global.user_times[bot.global.user_times.length - 1] > bot.global.message_delay_ms)
      ? 0
      : (bot.global.message_delay_ms - (Date.now() - bot.global.user_times[bot.global.user_times.length - 1]))
  }
}

// remove messages from time lists that exceed limit_periods age
function parseTimes (mod = 0) {
  let time = Date.now()
  if (mod) {
    for (let i = 0; i < bot.global.mod_times.length; i++) {
      if (bot.global.mod_times[i] < time - bot.global.limit_period * 1000) { // mesages are counted for limit_period seconds
        bot.global.mod_times.shift()
        i--
      } else break
    }
  } else {
    for (let i = 0; i < bot.global.user_times.length; i++) {
      if (bot.global.user_times[i] < time - bot.global.limit_period * 1000) { // mesages are counted for limit_period seconds
        bot.global.user_times.shift()
        i--
      } else break
    }
  }
}

// remove messages from time lists that exceed 1/60 sec age
function parseWhisperTimes () {
  let time = Date.now()
  for (let i = 0; i < bot.global.whisper_times_min.length; i++) {
    if (bot.global.whisper_times_min[i] < time - 60 * 1000) { // whisper messages are counted for 60 second
      bot.global.whisper_times_min.shift()
      i--
    } else break
  }
  for (let i = 0; i < bot.global.whisper_times_sec.length; i++) {
    if (bot.global.whisper_times_sec[i] < time - 1 * 1000) { // whisper messages are counted for 1 second too
      bot.global.whisper_times_sec.shift()
      i--
    } else break
  }
}
