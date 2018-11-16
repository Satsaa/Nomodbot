const util = require('util')
const myUtil = require('../myutil')
var opts = require('../../config/TwitchClient.json')

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
        if (err) console.log(err)
        // console.log(`${util.inspect(data, { showHidden: false, depth: null })} || ${err} || `)
        if (data.stream === null) {
          nmb.client.api({
            url: `https://api.twitch.tv/kraken/channels/${id}/videos?limit=1`, // don't want no more than 1 video
            method: 'GET',
            headers: {
              // 'Authorization': opts.identity.password.replace('oauth:', ''),
              'Client-ID': opts.options.clientId,
              'Accept': 'application/vnd.twitchtv.v5+json'
            }
          }, (err, res, data) => {
            if (err) console.log(err)
            // console.log(`${util.inspect(data, { showHidden: false, depth: null })} || ${err} || `)
            if (data._total === 0) {
              resolve(`${params[1] || channel.replace('#', '')} is not live. Last stream time unknown`)
            } else {
              let videoDate = new Date(data.videos[0].created_at)
              let videoEndMS = videoDate.getTime() + data.videos[0].length * 1000
              resolve(`${data.videos[0].channel.display_name}'s last vod was recorded ${myUtil.timeSince(videoEndMS, 2)} ago`)
            }
          })
        } else {
          let date = new Date(data.stream.created_at)
          let dateMS = date.getTime()

          resolve(`${data.stream.channel.display_name} ${data.stream.stream_type} uptime: ${myUtil.timeSince(dateMS)}`)
        }
      })
    }).catch((err) => {
      console.log(`[ERROR (${channel})] Error getting uptime: ${err}`)
      resolve(`${err}`)
    })
  })
}

module.exports.help = (params) => {
  return new Promise((resolve, reject) => {
    resolve(`Display how long a channel has been live or offline: ${params[1]} [<channel>]`)
  })
}
// curl -H 'Accept: application/vnd.twitchtv.v5+json' \
// -H 'Client-ID: uo6dggojyb8d6soh92zknwmi5ej1q2' \
// -X GET 'https://api.twitch.tv/kraken/channels/44322889/videos'
