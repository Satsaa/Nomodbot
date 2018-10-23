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
  if (bot[channel].antiDuplicate) {
    message = message + '\u206D' // '⁭' // U+206D
  }
  if (bot[channel].moderator) { // Moderator, no speed limit
    client.say(channel, message).then(() => {
      bot[channel].last_message = message
      bot.global.user_times.push(Date.now())
    }).catch((err) => {
      console.log(`* [${channel}] Msg failed: ${err}`)
    })
  } else queueChat(channel, message) // user needs limits
}

let chatQueue = [] // [[channel, message],...]
function queueChat (channel, message) {
  chatQueue.push([channel, message])

  console.log(`length ${chatQueue.length}`)
  if (chatQueue.length - 1 > 0) return

  setTimeout(() => { // send one message and init interval if needed afterwards
    client.say(chatQueue[0][0], chatQueue[0][1]).then(() => {
      bot[chatQueue[0][0]].last_message = message
      bot.global.user_times.push(Date.now())
      chatQueue.shift()
    }).catch((err) => {
      console.log(`* [${chatQueue[0][0]}] Msg failed: ${err}`)
    }).finally(() => {
      if (chatQueue.length) {
        let queueInteval = setInterval(() => { // send messages in intervals afterwards
          parseTimes()
          if (bot.global.user_times.length >= bot.global.user_limit) return // Rate limiting
          client.say(chatQueue[0][0], chatQueue[0][1]).then(() => {
            bot[chatQueue[0][0]].last_message = message
            bot.global.user_times.push(Date.now())
            chatQueue.shift()
          }).catch((err) => {
            console.log(`* [${chatQueue[0][0]}] Msg failed: ${err}`)
          }).finally(() => {
            if (!chatQueue.length) clearInterval(queueInteval)
          })
        }, bot.global.message_delay_ms)
      }
    })
  }, getDelay())

  function getDelay () {
    parseTimes()
    if (bot.global.user_times.length >= bot.global.user_limit) {
      // (oldest_message_time + 30 * 1000) - current time // next message when rate limit is not full anymore
      console.log((bot.global.user_times[0] + 30 * 1000) - Date.now())
      return (bot.global.user_times[0] + 30 * 1000) - Date.now()
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

// remove messages from msgtime list that exceed 30s
function parseTimes (moderator = 0) {
  let time = Date.now()
  if (moderator) {
    for (let i = 0; i < bot.global.moderator_times.length; i++) {
      if (bot.global.moderator_times[i] < time - 30 * 1000) { // mesages are counted for 30 seconds
        bot.global.moderator_times.shift()
        i--
      } else break
    }
    // console.log(JSON.stringify(bot.global.user_times, null, 2))
  } else {
    for (let i = 0; i < bot.global.user_times.length; i++) {
      if (bot.global.user_times[i] < time - 30 * 1000) { // mesages are counted for 30 seconds
        bot.global.user_times.shift()
        i--
      } else break
    }
    // console.log(JSON.stringify(bot.global.user_times, null, 2))
  }
}
