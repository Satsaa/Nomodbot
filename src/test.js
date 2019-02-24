
const keys = require('./lib/keys')
const Client = require('./lib/Client')
var client = new Client({
  username: keys.getKey('./src/cfg/keys.json', 'twitch', 'username'),
  password: keys.getKey('./src/cfg/keys.json', 'twitch', 'password')
})
global.keys = keys
global.client = client
client.connect()

setTimeout(() => {
}, 10000000)
