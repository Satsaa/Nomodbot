
const fs = require('fs').promises
const path = require('path')

var walkSync = function (dir, filelist) {
  var path = path || require('path')
  var fs = fs || require('fs')
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
  if (typeof commands[cmd].onJoin === 'function') {

  }
  if (typeof commands[cmd].onPart === 'function') {

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

module.exports.helpHandle = (command, channel, params) => {
  commands[command].help(params, channel).then((msg) => {
    nmb.msgHandler.chat(channel, msg)
  })
}
