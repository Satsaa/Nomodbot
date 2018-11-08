const fs = require('fs')
const myUtil = require('../myutil')

module.exports.init = () => {
  noModBot.client.on('message', onMessage)
}

let block = []
function onMessage (channel, userstate, message, self) {
  if (block.includes(channel)) {
    return
  }
  let short = noModBot.bot[channel].notifys // reference for neat code
  if (userstate.username in short) {
    for (var i = 0; i < short[userstate.username].length; i++) {
      let notify = short[userstate.username][i]
      let time = myUtil.MSToDHMS(Date.now() - notify.time)
      let timeStr = time[0] ? 'days' : time[1] ? 'hours' : time[2] ? 'mins' : time[3] ? 'secs' : 'secs'
      time = time[0] ? time[0] : time[1] ? time[1] : time[2] ? time[2] : time[3] ? time[3] : '0'
      if (time === 1) timeStr = timeStr.slice(0, -1) // remove 's' if singular
      noModBot.msgHandler.chat(channel, ` ${notify.from} -> @${userstate['display-name']} ${time} ${timeStr} ago: ${notify.msg}`)
    }
    delete short[userstate.username]
    block.splice(block.indexOf(channel), 1)
    save(channel, short)
  }
}

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    let short = noModBot.bot[channel].notifys // reference for neat code

    resolve(setNotify())
    save(channel, short)

    function setNotify () {
      if (!params[1]) return 'You must specify a user (param 1)'
      if (!params[2]) return 'You must specify a message (param 2+)'
      params[1] = params[1].toLowerCase()
      if (!short[params[1]]) { // No existing notifys
        short[params[1]] = [{
          from: userstate['display-name'],
          time: Date.now(),
          msg: params.slice(2).join(' ') }]
      } else { // otherwise push a new notify
        short[params[1]].push({
          from: userstate['display-name'],
          time: Date.now(),
          msg: params.slice(2).join(' ') })
      } return `${params[1]} now has ${short[params[1]].length} ${short[params[1]].length === 1 ? 'notify' : 'notifies'} @${userstate['display-name']}`
    }
  })
}

async function save (channel, notifys) {
  block.push(channel)
  fs.writeFile('./data/' + channel + '/notifys.json', JSON.stringify(notifys, null, 2), (err) => {
    if (!err) {
      console.log(`* [${channel}] Modified notify file`)
    } else {
      console.log(`* [${channel}] FAILED TO MODIFY NOTIFY FILE: ${err}`)
    }
    block.splice(block.indexOf(channel), 1)
  })
}

module.exports.help = (params) => {
  return new Promise((resolve, reject) => {
    resolve(`Notify a user when they are seen on this channel: ${params[1]} <user> <text...>`)
  })
}
