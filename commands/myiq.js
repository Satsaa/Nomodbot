
let util = require('../util.js')

module.exports.run = (userstate, params) => {
  let user
  if (params.length === 0) {
    user = userstate['display-name']
  } else {
    user = params[0]
  }
  let iq = Math.round(util.RandomNormal(-50, 1005, 3))
  return `${user}'s iq is ${iq.toString()}${getEmote(iq)}`
}

module.exports.help = () => {
  return 'Return actual iq of a chatter. command [<recipient>]'
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
