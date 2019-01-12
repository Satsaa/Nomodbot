const myUtil = require('../../myutil')
var opts = require('../../../keyConfig/TwitchClient.json')
var mu = require('../../myutil')

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    var options = {
      host: 'api.spotify.com',
      port: 443,
      path: '/v1/playlists/3QCcb0wrci4l5aa9SbbVlN/',
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + accessToken
      }
    }

    https.get(options, (res) => {
      switch (res.statusCode) {
        case 200: // success!
          var data = ''
          res.on('data', (chunk) => {
            data += chunk
          }).on('end', () => {
            let result = JSON.parse(data)
            console.log(result)
            let track = result.tracks.items[0].track
            let title = track.name
            let artists = mu.commaPunctuate(track.artists.map(i => i.name))
            let url = track.external_urls.spotify.replace('https://', '')
            resolve(`"${title}" by ${artists}. ${url}`)
          }).on('error', (err) => {
            console.log(err)
          })
          break
        default:
          resolve(`Error. Status code: ${res.statusCode}`)
          break
      }
    })
  })
}

module.exports.help = (params) => {
  return new Promise((resolve, reject) => {
    resolve(`Display current song and a link: ${params[1]}`)
  })
}

var SpotifyWebApi = require('spotify-web-api-node')
var keys = require('../../../keyConfig/Spotify.json')
var https = require('https')

var spotifyApi = new SpotifyWebApi({
  clientId: keys.clientID,
  clientSecret: keys.clientSecret
})

// Retrieve an access token
var accessToken = null
getAccessToken()
setInterval(() => {
  getAccessToken()
}, 3600000) // 1 hour
function getAccessToken () {
  spotifyApi.clientCredentialsGrant().then(
    function (data) {
      console.log('The access token expires in ' + data.body['expires_in'])
      console.log('The access token is ' + data.body['access_token'])
      accessToken = data.body['access_token']
    },
    function (err) {
      console.log(
        'Something went wrong when retrieving an access token',
        err.message
      )
    }
  )
}

/*
"https://api.spotify.com/v1/playlists/3QCcb0wrci4l5aa9SbbVlN" -H "Accept: application/json" -H "Content-Type: application/json" -H "Authorization: Bearer BQDcRwuQHvLUqfoBoFtFYhCauwicEJE5eRPa_uTxEhsCBYboUCrfTABnOM3MABVhXFJDBKHy68rnpwu1Za8"
*/
