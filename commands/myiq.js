
let util = require('../util.js')

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    let user
    if (params.length === 1) {
      user = userstate['display-name']
    } else {
      user = params[1]
    }
    let iq = Math.round(util.RandomNormal(-50, 1005, 3))
    resolve(`${user}'s RealIQ is ${iq.toString()}${getEmote(iq)}`)
  })
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
