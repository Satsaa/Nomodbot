const myUtil = require('../../myutil')
var opts = require('../../../keyConfig/TwitchClient.json')

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    if (params[1] && params[1].length > 2) {
      channel = params[1]
    }
    nmb.getUserId(channel).then((id) => {
      nmb.client.api({
        url: `https://api.twitch.tv/kraken/streams/${id}`,
        method: 'GET',
        headers: {
          'Authorization': opts.identity.password.replace('oauth:', ''),
          'Client-ID': opts.options.clientId,
          'Accept': 'application/vnd.twitchtv.v5+json'
        }
      }, (err, res, data) => {
        if (err) console.error(err)
        if (data.stream === null) {
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

              let averageAngle = meanAngleDeg(clockAngles)
              if (averageAngle < 0) averageAngle = averageAngle + 360
              let hours = Math.floor(averageAngle / 15)
              let minutes = Math.round((averageAngle / 15 - hours) * 60)

              // Previous stream stats
              let videoDate = new Date(data.videos[0].created_at)
              let videoEndMS = videoDate.getTime() + data.videos[0].length * 1000
              let durationStr = myUtil.durationStr(data.videos[0].length * 1000, 2, true)

              resolve(`${data.videos[0].channel.display_name} went offline ${myUtil.timeSince(videoEndMS, 2)} ago. Stream started ${myUtil.timeSince(videoDate.getTime(), 2, 1)} ago and lasted for ${durationStr}. Average stream time: ${hours}:${minutes} UTC (last ${counted} streams)`)
            }
          })
        } else {
          let date = new Date(data.stream.created_at)
          let dateMS = date.getTime()

          resolve(`${data.stream.channel.display_name} ${data.stream.stream_type} uptime: ${myUtil.timeSince(dateMS)}`)
        }
      })
    }).catch((err) => {
      console.error(`[ERROR (${channel})] Error getting uptime: ${err}`)
      resolve(`${err}`)
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
