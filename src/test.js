
import 'test.d.ts'

const secretKey = require('./lib/secretKey')
const Client = require('./lib/Client')
var client = new Client({
  username: secretKey.getKey('./src/cfg/keys.json', 'twitch', 'username'),
  password: secretKey.getKey('./src/cfg/keys.json', 'twitch', 'password')
})
global.keys = secretKey
global.client = client
client.connect()

setTimeout(() => {
}, 10000000)
