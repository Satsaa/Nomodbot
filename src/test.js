
const Client = require('./lib/Client')
var client = new Client()
global.client = client
client.connect()

global.parser = require('./lib/parser')

setTimeout(() => {
}, 10000000)
