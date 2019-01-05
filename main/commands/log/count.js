let myUtil = require('../../myutil.js')

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    if (!params[1]) return resolve('Define a word or multiple (param 1+)')
    if (params[2]) { // multiple word use
      let text = ''
      for (let i = 0; i < params.length; i++) {
        if (i === 0) continue
        let count = typeof nmb.bot[channel].counts[params[i].toLowerCase()] === 'undefined' ? 0 : nmb.bot[channel].counts[params[i].toLowerCase()] - 1
        text += `${params[i]}: ${count} | `
      }
      return resolve(text.substring(0, text.length - 3)) // send and remove trailing " | "
    } else {
      let word = params[1].toLowerCase()
      if (typeof nmb.bot[channel].counts[word] === 'undefined' || nmb.bot[channel].counts[word] - 1 === 0) {
        resolve(`${params[1]} has not been said before`)
      } else {
        let count = nmb.bot[channel].counts[word] - 1
        resolve(`${params[1]} has been said ${count} ${myUtil.plural(count, 'time', 'times')}`)
      }
    }
  })
}

module.exports.help = (params, channel) => {
  return new Promise((resolve, reject) => {
    resolve(`Get how many times a word has been said: ${params[1]} <word>. Logging for this channel started ${myUtil.dateString(nmb.bot.log[channel].start_time * 1000)}`)
  })
}
