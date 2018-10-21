
var client
var bot

module.exports.refer = (clientRef, botRef) => {
  client = clientRef
  bot = botRef
}

module.exports.receive = (channel, userstate, message, self, client) => {
  console.log(userstate)

  switch (userstate['message-type']) {
    case 'action':
      console.log(`[${channel} (${userstate['message-type']})] ${userstate.username}: ${message}`)
      break
    case 'chat':
      console.log(`[${channel} (${userstate['message-type']})] ${userstate.username}: ${message}`)
      if (!self) {
        client.say(channel, message)
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
