var client = {}
var bot = {}
module.exports.refer = (clientRef, botRef) => {
  client = clientRef
  bot = botRef
}

module.exports.receive = (channel, userstate, message, self) => {
  switch (userstate['message-type']) {
    case 'action':
      console.log(`[${channel} (${userstate['message-type']})] ${userstate.username}: ${message}`)
      break
    case 'chat':
      // console.log(`[${channel} (${userstate['message-type']})] ${userstate.username}: ${message}`)
      if (!self) {
        chat(channel, message)
      }
      break
    case 'whisper':
      console.log(`[${channel} (${userstate['message-type']})] ${userstate.username}: ${message}`)
      break
    default:
      console.log(`[${channel} (${userstate['message-type']})] ${userstate.username}: ${message}`)
      break
  }
}

function chat (channel, message) {
  bot[channel].antiDuplicate = !bot[channel].antiDuplicate
  if (bot[channel].moderator) { // Moderator, no speed limit, max 100 per bot.global.limit_period sec tho
    parseTimes(1)
    console.log(`${bot.global.moderator_times.length} >= ${bot.global.moderator_limit} = ${bot.global.moderator_times.length >= bot.global.moderator_limit}`)
    if (bot.global.moderator_times.length >= bot.global.moderator_limit) { // if ratelimit is full
      queueModChat(channel, message)
      return
    }
    client.say(channel, message).then(() => {
      bot[channel].last_message = message
      bot.global.moderator_times.push(Date.now())
    }).catch((err) => {
      bot[channel].antiDuplicate = !bot[channel].antiDuplicate
      console.log(`* [${channel}] Msg failed: ${err}`)
    })
  } else { // user needs limits
    if (bot[channel].antiDuplicate) { // add character to avoid duplicate messages
      message = message + '\u206D jeebroni' // U+206D = ACTIVATE ARABIC FORM SHAPING // invisible character
    }
    queueChat(channel, message)
  }
}

let modQueue = [] // [[channel, message],...]
function queueModChat (channel, message) {
  modQueue.push([channel, message])

  // console.log(`length ${modQueue.length}`)
  if (modQueue.length !== 1) return // return if queue is active

  setTimeout(timeoutMsg, getTimeout())

  function timeoutMsg () {
    client.say(modQueue[0][0], modQueue[0][1]).then(() => {
      bot[modQueue[0][0]].last_message = message
      bot.global.moderator_times.push(Date.now())
      modQueue.shift()
    }).catch((err) => {
      bot[channel].antiDuplicate = !bot[channel].antiDuplicate // if msg failed, twitch doesnt count it as the last message
      console.log(`* [${modQueue[0][0]}] Msg failed: ${err}`)
    }).finally(() => {
      parseTimes(1)
      if (modQueue.length) { // continue queue
        console.log('continued')
        setTimeout(timeoutMsg, getTimeout())
      }
    })
  }

  function getTimeout () {
    // (oldest_message_time + bot.global.limit_period * 1000) - current time // ms until queue is not full anymore
    console.log(`length: ${bot.global.moderator_times.length} timeout: ${(bot.global.moderator_times[0] + bot.global.limit_period * 1000) - Date.now()}`)
    return (bot.global.moderator_times[0] + bot.global.limit_period * 1000) - Date.now() + 50 // + 50 so parse parsetimeout() removes the oldest time
  }
}

let chatQueue = [] // [[channel, message],...]
function queueChat (channel, message) {
  chatQueue.push([channel, message])

  // console.log(`length ${chatQueue.length}`)
  if (chatQueue.length !== 1) return // return if queue is active

  setTimeout(() => { // send one message and init interval if needed afterwards
    bot.global.user_times.push(Date.now())
    client.say(chatQueue[0][0], chatQueue[0][1]).then(() => {
      bot[chatQueue[0][0]].last_message = message
      chatQueue.shift()
    }).catch((err) => {
      bot[channel].antiDuplicate = !bot[channel].antiDuplicate // if msg failed, twitch doesnt count it as the last message
      console.log(`* [${chatQueue[0][0]}] Msg failed: ${err}`)
    }).finally(() => {
      if (chatQueue.length) {
        let queueInteval = setInterval(() => { // send messages in intervals afterwards
          parseTimes()
          if (bot.global.user_times.length >= bot.global.user_limit) return // Rate limiting
          bot.global.user_times.push(Date.now())
          client.say(chatQueue[0][0], chatQueue[0][1]).then(() => {
            bot[chatQueue[0][0]].last_message = message
            chatQueue.shift()
          }).catch((err) => {
            bot[channel].antiDuplicate = !bot[channel].antiDuplicate // if msg failed, twitch doesnt count it as the last message
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
      // (oldest_message_time + bot.global.limit_period * 1000) - current time // ms until queue is not full anymore
      return (bot.global.user_times[0] + bot.global.limit_period * 1000) - Date.now()
    }

    // current_time - last_message_time > message_delay ? 0 : message_delay - (current_time - last_message_time)
    console.log((Date.now() - bot.global.user_times[bot.global.user_times.length - 1] > bot.global.message_delay_ms)
      ? 0
      : (bot.global.message_delay_ms - (Date.now() - bot.global.user_times[bot.global.user_times.length - 1])))
    return (Date.now() - bot.global.user_times[bot.global.user_times.length - 1] > bot.global.message_delay_ms)
      ? 0
      : (bot.global.message_delay_ms - (Date.now() - bot.global.user_times[bot.global.user_times.length - 1]))
  }
}

// remove messages from time lists that exceed bot.global.limit_periods age
function parseTimes (moderator = 0) {
  let time = Date.now()
  if (moderator) {
    for (let i = 0; i < bot.global.moderator_times.length; i++) {
      if (bot.global.moderator_times[i] < time - bot.global.limit_period * 1000) { // mesages are counted for bot.global.limit_period seconds
        bot.global.moderator_times.shift()
        i--
      } else break
    }
    // console.log(JSON.stringify(bot.global.user_times, null, 2))
  } else {
    for (let i = 0; i < bot.global.user_times.length; i++) {
      if (bot.global.user_times[i] < time - bot.global.limit_period * 1000) { // mesages are counted for bot.global.limit_period seconds
        bot.global.user_times.shift()
        i--
      } else break
    }
    // console.log(JSON.stringify(bot.global.user_times, null, 2))
  }
}
