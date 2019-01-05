const myUtil = require('../../myutil')
var opts = require('../../../keyConfig/TwitchClient.json')

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    if (params[1] && params[1].length > 2) {
      channel = params[1]
    }
    nmb.getUserId(channel).then((id) => {
      nmb.client.api({
        url: `https://api.twitch.tv/kraken/channels/${id}/videos?limit=30&broadcast_type=archive`, // Multiple videos for average time
        method: 'GET',
        headers: {
        // 'Authorization': opts.identity.password.replace('oauth:', ''),
          'Client-ID': opts.options.clientId,
          'Accept': 'application/vnd.twitchtv.v5+json'
        }
      }, (err, res, data) => {
        if (err) {
          console.error(err)
          return resolve(`Error occurred: ${err.code}`)
        }
        console.log(data)
        if (data._total === 0) {
          resolve(`${params[1] || channel.replace('#', '')} is not currently live. Last stream time unknown`)
        } else {
          // Calculate average stats
          let clockAngles = []
          let totalDuration = 0
          let counted = 0
          data.videos.forEach(video => {
            if (counted < 30) {
              let date = new Date(video.created_at)
              clockAngles.push(date.getUTCHours() * 15 + date.getUTCMinutes() * (15 / 60))
              totalDuration += video.length * 1000
              counted++
            }
          })
          let averageDuration = totalDuration / counted
          let averageAngle = meanAngleDeg(clockAngles)
          if (averageAngle < 0) averageAngle = averageAngle + 360
          let hours = Math.floor(averageAngle / 15)
          let minutes = Math.round((averageAngle / 15 - hours) * 60)

          // Previous stream stats
          resolve(`${data.videos[0].channel.display_name} usually streams at ${hours}:${minutes} UTC for ${myUtil.durationStr(averageDuration, 2, 1)} (average of last ${counted} streams)`)
        }
      })
    })
  })
}

module.exports.help = (params) => {
  return new Promise((resolve, reject) => {
    resolve(`Display how long a channel has been live or offline: ${params[1]} [<channel>]. Offline times are based on last recorded vod`)
  })
}

function sum (a) {
  var s = 0
  for (var i = 0; i < a.length; i++) s += a[i]
  return s
}
function degToRad (a) {
  return Math.PI / 180 * a
}
function meanAngleDeg (a) {
  return 180 / Math.PI * Math.atan2(
    sum(a.map(degToRad).map(Math.sin)) / a.length,
    sum(a.map(degToRad).map(Math.cos)) / a.length
  )
}
