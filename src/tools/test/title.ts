
import https from 'https'

const channelId = 266132990
const clientId = ''
const userToken = ''
const scope = 'channel_editor'
const title = 'test title'
const game = 'Dota 2'

const options = {
  host: 'api.twitch.tv',
  path: `/kraken/channels/${channelId}`,
  method: 'PUT',
  headers: {
    'Client-ID': clientId,
    'Accept': 'application/vnd.twitchtv.v5+json',
    'Content-Type': 'application/json',
    'Authorization': `OAuth ${userToken}`,
  },
}

const req = https.request(options, (res) => {
  console.log('STATUS: ' + res.statusCode)
  console.log('HEADERS: ' + JSON.stringify(res.headers))
  res.setEncoding('utf8')
  res.on('data', (chunk) => {
    console.log('BODY: ' + chunk)
  })
})

req.on('error', (e) => {
  console.log('problem with request: ' + e.message)
})

// write data to request body
const data = `{"channel": {${title ? `"status": "${title}"` : ''}${game ? `"game": "${game}"` : ''}}}`
req.write('{"channel": {"status": "testest of tests", "game": "Just Chatting"}}')
req.end()
