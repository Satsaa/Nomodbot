const fs = require('fs')
let util = require('../util.js')
let global = require('../data/global/myiq.json')

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    fs.access('./data/' + channel + '/myiq.json', fs.constants.F_OK, (err) => {
      if (err) { // not created
      // console.log(`* [${channel}] Creating settings file`)
        fs.copyFile('./data/default/myiq.json', './data/' + channel + '/myiq.json', err => {
          if (err) throw err
          resolve(main(channel, userstate, params))
        })
      } else resolve(main(channel, userstate, params))
    })

    function main (channel, userstate, params) {
      let local = require('../data/' + channel + '/myiq.json')

      let user
      if (params.length === 1) {
        user = userstate['display-name']
      } else {
        user = params[1]
      }
      let iq = Math.round(util.RandomNormal(-50, 1005, 3))
      let recordChannel = getRecord(iq, userstate['display-name'], local)
      let recordGlobal = getGlobalRecord(iq, userstate['display-name'])
      if (recordGlobal[0]) {
        return `${user}'s RealIQ is ${iq.toString()}${getEmote(iq)} Beat global record by ${recordGlobal[2]} by ${iq - recordGlobal[1]} IQ! PogChamp `
      } else if (recordChannel[0]) {
        return `${user}'s RealIQ is ${iq.toString()}${getEmote(iq)} Beat channel record by ${recordChannel[2]} by ${iq - recordChannel[1]} IQ! PogChamp `
      } else return `${user}'s RealIQ is ${iq.toString()}${getEmote(iq)}`
    }
  })

  function getRecord (v, user, local) {
    if (local.record === null || v > local.record) {
      let oldRecord = local.record
      local.record = v
      let oldUser = local.holder
      local.holder = user
      fs.writeFile('./data/' + channel + '/myiq.json', JSON.stringify(local, null, 2), 'utf8', (err) => {
        if (err) throw err
      })
      return [true, oldRecord, oldUser]
    } return [false, null, null]
  }

  function getGlobalRecord (v, user) {
    if (global.record === null || v > global.record) {
      let oldRecord = global.record
      global.record = v
      let oldUser = global.holder
      global.holder = user
      fs.writeFile('./data/global/myiq.json', JSON.stringify(global, null, 2), 'utf8', (err) => {
        if (err) throw err
      })
      return [true, oldRecord, oldUser]
    } return [false, null, null]
  }
}

module.exports.help = () => {
  return new Promise((resolve, reject) => {
    resolve('Return real iq of a chatter: command [<recipient>]')
  })
}

// get what emote to use with iq statement. i = iq, e = emote
function getEmote (i) {
  if (i < 0) {
    return ' POGGERS'
  } else if (i < 10) {
    return ' 🌱'
  } else if (i === 69) {
    return ' Kreygasm'
  } else if (i < 69) {
    return ' BrokeBack'
  } else if (i < 100) {
    return ' 4Head'
  } else if (i < 150) {
    return ' SeemsGood'
  } else if (i < 240) {
    return ' PogChamp'
  } else if (i < 300) {
    return ' baumiBottlepog'
  } else if (i === 322) {
    return ', stop throwing.'
  } else if (i === 420) {
    return ' VapeNation'
  } else if (i < 420) {
    return ' Ayy 👽'
  } else {
    return ' monkaS'
  }
}
