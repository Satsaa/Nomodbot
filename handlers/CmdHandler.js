
let commands = {}

commands['echo'] = (require('../commands/echo.js'))
commands['exit'] = require('../commands/exit.js')
commands['myiq'] = require('../commands/myiq.js')
commands['join'] = require('../commands/join.js')
commands['part'] = require('../commands/part.js')
commands['manlyquote'] = require('../commands/manlyquote.js')
commands['quote'] = require('../commands/quote.js')
commands['meme'] = require('../commands/meme.js')
commands['response'] = require('../commands/response.js')
commands['artifact'] = require('../commands/artifact.js')

for (var cmd in commands) {
  if (typeof commands[cmd].run !== 'function') {
    console.log(`* [ERROR] ${cmd} doesn't have an exported run function and is therefore unloaded`)
    delete commands[cmd]
  } else {
    if (typeof commands[cmd].help !== 'function') {
      console.log(`* [ERROR] ${cmd} doesn't have an exported help function and is therefore unloaded`)
      delete commands[cmd]
    } else {
      if (typeof commands[cmd].refer === 'function') {
        commands[cmd].refer(noModBot) // refer command if needed
      }
      if (typeof commands[cmd].init === 'function') {
        commands[cmd].init(noModBot) // init command if needed
      }
    }
  }
}

module.exports.handle = (command, channel, userstate, params) => {
  console.log(`* [${channel}] Running ${command}`)
  let msg = null
  if (typeof commands[command] === 'undefined') {
    console.log(`* [${channel}] ${command} doesn't exist or ${command}.js isn't loaded`)
  } else {
    commands[command].run(channel, userstate, params).then((msg) => {
      if (msg !== null) {
        noModBot.msgHandler.chat(channel, msg)
      }
    })
  }
}

module.exports.customHandle = (text, channel, userstate, params) => {
  noModBot.msgHandler.chat(channel, text)
}
