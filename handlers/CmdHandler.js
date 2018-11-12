
let commands = {}

commands['exit'] = require('../commands/control/exit.js')
commands['join'] = require('../commands/control/join.js')
commands['part'] = require('../commands/control/part.js')
commands['reload'] = require('../commands/control/reload.js')
commands['save'] = require('../commands/control/save.js')

commands['echo'] = (require('../commands/echo.js'))
commands['myiq'] = require('../commands/myiq.js')
commands['manlyquote'] = require('../commands/manlyquote.js')
commands['quote'] = require('../commands/quote.js')
commands['response'] = require('../commands/response.js')
commands['artifact'] = require('../commands/artifact.js')
commands['numvote'] = require('../commands/numvote.js')
commands['bottime'] = require('../commands/bottime.js')
commands['uptime'] = require('../commands/uptime.js')
commands['commands'] = require('../commands/commands.js')
commands['notify'] = require('../commands/notify.js')
commands['define'] = require('../commands/define.js')

for (let cmd in commands) {
  if (typeof commands[cmd].run !== 'function') {
    console.log(`* [ERROR] ${cmd} doesn't have an exported run function and is therefore unloaded`)
    delete commands[cmd]
  }
  if (typeof commands[cmd].help !== 'function') {
    console.log(`* [ERROR] ${cmd} doesn't have an exported help function and is therefore unloaded`)
    delete commands[cmd]
  }
  if (typeof commands[cmd].init === 'function') {
    setImmediate(() => { // immediate so nmb is defined
      commands[cmd].init() // init on start if needed
    })
  }
}

module.exports.handle = (command, channel, userstate, params) => {
  console.log(`* [${channel}] Running ${command}`)
  if (typeof commands[command] === 'undefined') {
    console.log(`* [ERROR] ${command} doesn't exist or ${command}.js isn't loaded`)
  } else {
    commands[command].run(channel, userstate, params).then((msg) => {
      if (msg !== null) {
        nmb.msgHandler.chat(channel, msg)
      }
    })
  }
}

module.exports.responseHandle = (text, channel, userstate, params) => {
  nmb.msgHandler.chat(channel, text)
}

module.exports.helpHandle = (command, channel, params) => {
  commands[command].help(params).then((msg) => {
    nmb.msgHandler.chat(channel, msg)
  })
}
