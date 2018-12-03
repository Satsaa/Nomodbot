const fs = require('fs')
let myUtil = require('../../myutil.js')
let global = require('../../../data/global/myiq.json')

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    fs.access('./data/' + channel + '/myiq.json', fs.constants.F_OK, (err) => {
      if (err) { // not created
        fs.copyFile('./data/default/myiq.json', './data/' + channel + '/myiq.json', err => {
          if (err) throw err
          console.log(`* [${channel}] Created myiq file`)
          resolve(main(channel, userstate, params))
        })
      } else resolve(main(channel, userstate, params))
    })

    function main (channel, userstate, params) {
      let short = nmb.bot[channel].myiq // reference for neat code

      if (params[1] && (params[1].toLowerCase() === 'record' || params[1].toLowerCase() === 'records')) {
        return resolve(`Channel records: ${short.record} by ${short.holder} and ${short.low_record} by ${short.low_holder}. Global records: ${global.record} by ${global.holder} and ${global.low_record} by ${global.low_holder}.`)
      }

      let user
      if (params.length === 1) {
        user = userstate['display-name']
      } else {
        user = params[1]
      }
      let iq = Math.round(myUtil.randomNormal(-50, 1005, 3))

      let recordChannel = getRecord(iq, userstate['display-name'], channel, short)
      let recordGlobal = getGlobalRecord(iq, userstate['display-name'])
      let recordLowChannel = getLowRecord(iq, userstate['display-name'], channel, short)
      let recordLowGlobal = getLowGlobalRecord(iq, userstate['display-name'])

      if (recordGlobal[0]) {
        return `${user}'s RealIQ is ${iq.toString()}${getEmote(iq)} Beat global record by ${recordGlobal[2]} by ${iq - recordGlobal[1]} IQ! PogChamp `
      } else if (recordChannel[0]) {
        return `${user}'s RealIQ is ${iq.toString()}${getEmote(iq)} Beat channel record by ${recordChannel[2]} by ${iq - recordChannel[1]} IQ! PogChamp `
      } else if (recordLowGlobal[0]) {
        return `${user}'s RealIQ is ${iq.toString()}${getEmote(iq)} Beat global low record by ${recordLowGlobal[2]} by ${iq - recordLowGlobal[1]} IQ! OMEGALUL `
      } else if (recordLowChannel[0]) {
        return `${user}'s RealIQ is ${iq.toString()}${getEmote(iq)} Beat channel low record by ${recordLowChannel[2]} by ${iq - recordLowChannel[1]} IQ! OMEGALUL `
      } else return `${user}'s RealIQ is ${iq.toString()}${getEmote(iq)}`
    }
  })

  function getRecord (v, user, channel, short) {
    if (short.record === null || v > short.record) {
      let oldRecord = short.record
      short.record = v
      let oldUser = short.holder
      short.holder = user
      fs.writeFile('./data/' + channel + '/myiq.json', JSON.stringify(short, null, 2), 'utf8', (err) => {
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

  function getLowRecord (v, user, channel, short) {
    if (short.low_record === null || v < short.low_record) {
      let oldRecord = short.low_record
      short.low_record = v
      let oldUser = short.low_holder
      short.low_holder = user
      fs.writeFile('./data/' + channel + '/myiq.json', JSON.stringify(short, null, 2), 'utf8', (err) => {
        if (err) throw err
      })
      return [true, oldRecord, oldUser]
    } return [false, null, null]
  }

  function getLowGlobalRecord (v, user) {
    if (global.low_record === null || v < global.low_record) {
      let oldRecord = global.low_record
      global.low_record = v
      let oldUser = global.low_holder
      global.low_holder = user
      fs.writeFile('./data/global/myiq.json', JSON.stringify(global, null, 2), 'utf8', (err) => {
        if (err) throw err
      })
      return [true, oldRecord, oldUser]
    } return [false, null, null]
  }

  function getEmote (v) {
    if (v < 0) {
      return ' POGGERS'
    } else if (v < 10) {
      return ' SMOrc'
    } else if (v === 69) {
      return ' Kreygasm'
    } else if (v < 69) {
      return ' BrokeBack'
    } else if (v < 100) {
      return ' 4Head'
    } else if (v < 150) {
      return ' SeemsGood'
    } else if (v < 225) {
      return ' PogChamp'
    } else if (v < 300) {
      if (channel === '#l34um1') {
        if (nmb.bot[channel].channel.subscriber) return ' baumiBottlepog'
        else return ' 🍼+ PogChamp'
      } else return ' NaM'
    } else if (v === 322) {
      return ', stop throwing.'
    } else if (v === 420) {
      return ' VapeNation'
    } else if (v < 420) {
      return ' Ayy 👽'
    } else {
      return ' monkaS'
    }
  }
}

module.exports.help = (params) => {
  return new Promise((resolve, reject) => {
    resolve(`Return the real IQ of a user: ${params[1]} [<recipient>]. Return the channel record: ${params[1]} record`)
  })
}
