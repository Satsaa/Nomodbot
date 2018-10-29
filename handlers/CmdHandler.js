let twitch = {}
let client = {}
let bot = {}
module.exports.refer = (clientRef, botRef, twitchRef) => {
  twitch = twitchRef
  client = clientRef
  bot = botRef

  join.refer(twitch)
  part.refer(twitch)
}

let echo = require('../commands/echo.js')
let exit = require('../commands/exit.js')
let myiq = require('../commands/myiq.js')
let join = require('../commands/join.js')
let part = require('../commands/part.js')
let manlyquote = require('../commands/manlyquote.js')
let quote = require('../commands/quote.js')

module.exports.handle = (channel, userstate, command, params) => {
  console.log(`* [${channel}] Running ${command}`)
  let msg = null
  switch (command) {
    case 'echo':
      msg = echo.run(params)
      break
    case 'join':
      msg = join.run(params)
      break
    case 'part':
      msg = part.run(params)
      break
    case 'exit':
      msg = exit.run(params)
      break
    case 'myiq':
      msg = myiq.run(userstate, params)
      break
    case 'manlyquote':
      msg = manlyquote.run(params)
      break
    case 'quote':
      quote.run(channel, params).then(function (msg) {
        twitch.msgHandler.chat(channel, msg)
      })
      break
    default:
      console.log(`* [${channel}] INVALID COMMAND AT cmdHandler.handle`)
      break
  }
  if (msg) twitch.msgHandler.chat(channel, msg)
}

module.exports.custom = (channel, command, params) => {
  console.log(`* [${channel}] Running ${command}`)
}
