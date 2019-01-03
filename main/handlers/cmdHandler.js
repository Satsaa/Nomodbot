
const fs = require('fs')
const path = require('path')

function walkSync (dir, filelist) {
  var files = fs.readdirSync(dir)
  filelist = filelist || []
  files.forEach(function (file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist)
    } else {
      filelist.push(path.join(dir, file))
    }
  })
  return filelist
}

let commands = {}

walkSync('./main/commands/').forEach(path => {
  path = path.replace(/\\/gi, '/').replace('main', '..')
  let name = path.split('/').pop().replace('.js', '')
  commands[name] = require(path)
})

for (let cmd in commands) {
  if (typeof commands[cmd].run !== 'function') {
    console.error(`* [COMMANDHANDLER] ${cmd} doesn't have an exported run function and is therefore unloaded`)
    delete commands[cmd]
  }
  if (typeof commands[cmd].help !== 'function') {
    console.error(`* [COMMANDHANDLER] ${cmd} doesn't have an exported help function and is therefore unloaded`)
    delete commands[cmd]
  }
  if (commands[cmd]) { // if not unloaded above
    if (typeof commands[cmd].init === 'function') {
      setImmediate(() => { // immediate so nmb is defined
        commands[cmd].init() // init after bot launch if needed
      })
    }
    if (typeof commands[cmd].onJoin === 'function') {

    }
    if (typeof commands[cmd].onPart === 'function') {

    }
  }
}

module.exports.handle = (command, channel, userstate, params) => {
  if (typeof commands[command] === 'undefined') { // make sure command exists
    console.error(`* [COMMANDHANDLER] ${command} doesn't exist or ${command}.js isn't loaded`)
  } else {
    let settings = nmb.bot[channel].commands[params[0]] // refer to command in commands(.json)
    if (!nmb.bot[channel].commandData[params[0]]) nmb.bot[channel].commandData[params[0]] = {}
    let data = nmb.bot[channel].commandData[params[0]]
    if (settings.userlvl) {
      switch (settings.userlvl) {
        case 'master':
          if (!nmb.bot.config.masters.includes(userstate['username'])) return
          break

        case 'moderator':
        case 'mod': // also includes broadcaster as a moderator
          if (!userstate.badges.hasOwnProperty(settings.userlvl) && !userstate.badges.hasOwnProperty('broadcaster')) return
          break

        default:
          if (!userstate.badges.hasOwnProperty(settings.userlvl)) return
          break
      }
    }
    if (settings.cooldown) {
      initData(data, 'times', [])
      parseTimes(data.times, settings.cooldown)
      if (data.times.length >= (settings.usespercooldown ? settings.usespercooldown : 1)) {
        return // Limit reached
      }
    }

    let user = userstate.username
    if (settings.usercooldown) {
      initData(data, 'usertimes', {})
      if (!data.usertimes.hasOwnProperty(user)) data.usertimes[user] = []
      parseTimes(data.usertimes[user], settings.usercooldown)
      if (data.usertimes[user].length >= (settings.usespercooldown ? settings.usespercooldown : 1)) {
        return // Limit reached
      }
    }

    if (settings.cooldown) data.times.push(Date.now())
    if (settings.usercooldown) data.usertimes[user].push(Date.now())

    console.log(`* [${channel}] Running ${command}`)
    commands[command].run(channel, userstate, params).then((msg) => {
      if (msg !== null) {
        nmb.msgHandler.chat(channel, msg)
      }
    })
  }
}

function initData (data, addition, value = null) {
  if (!data) data = {}
  if (addition) {
    if (typeof data[addition] === 'undefined') {
      data[addition] = value
    }
  }
}
/*
"?uptime": {
    "command": "uptime",
    "userlvl": "master/subscriber..."
    "substreak" 1,3,6,12,24,36 // minimum subscriber-streak. Used with userlvl on subscriber
    "unlisted": bool // if to be listed in commands
    "cooldown": ms
    "usercooldown": ms // cooldown that is user specific 
    "usespercooldown": int // how many times you can use before going on cooldown
  }
*/

// remove times from array that exceed age
function parseTimes (array, ageMS) {
  let time = Date.now()
  for (let i = 0; i < array.length; i++) {
    if (array[i] < time - ageMS) {
      array.shift()
      i--
    } else break
  }
}

module.exports.helpHandle = (command, channel, params) => {
  commands[command].help(params, channel).then((msg) => {
    nmb.msgHandler.chat(channel, msg)
  })
}
