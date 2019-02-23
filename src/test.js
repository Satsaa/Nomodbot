
const Client = require('./lib/Client')
var client = new Client()
global.client = client
// client.connect()

global.rl = require('./lib/rateLimiter')
global.rl = new rl.Queue()

setTimeout(() => {
}, 10000000)
