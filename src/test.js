
const Client = require('./lib/Client')
var client = new Client()

global.client = client

setTimeout(() => {
  client.connect()
}, 1000)
