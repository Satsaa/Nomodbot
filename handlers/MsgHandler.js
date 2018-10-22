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
      console.log(`[${channel} (${userstate['message-type']})] ${userstate.username}: ${message}`)
      if (!self) {
        say(channel, message)
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

function say (channel, message) {
  parseTimes(channel)
  if (bot.global.usertimes.length >= bot.global.chatlimit) {
    console.log(`* [Ratelimit] Reached`)
    return
  }
  client.say(channel, message).then((data) => {
    bot.global.lastmessage = message
    bot.global.usertimes.push(Date.now())
  }).catch((err) => {
    console.log(`* [${channel}] Msg failed: ${err}`)
  })
}

let chatQueue = [] // channel: message
function queueChat () {

}

// remove messages from msgtime list that exceed 30s
function parseTimes (moderator) {
  let time = Date.now()
  for (var i = 0; i < bot.global.usertimes.length; i++) {
    if (bot.global.usertimes[i] < time - 15 * 1000) { // >30< * 1000 is default
      bot.global.usertimes.shift()
      i--
    } else break
  }
  console.log('###2###' + JSON.stringify(bot.global.usertimes, null, 2))
}
