
const WebSocket = require('ws')

/**
 * A client for interacting with Twitch API
 */
module.exports = class TwitchClient {
  /**
   * Client for Twitch
   * @param {Object} options
   * @param {string} options.server Server url. E.G. "irc-ws.chat.twitch.tv"
   * @param {number} options.port Port of the server
   * @param {boolean} options.secure Use SSL
   */
  constructor (options = {}) {
    this.server = options.server || 'irc-ws.chat.twitch.tv'
    this.port = options.port || 80
    this.secure = options.secure || false
    this.channels = []
  }

  connect () {
    console.log('attempting to connect')
    this.ws = new WebSocket(`${this.secure ? 'wss' : 'ws'}://${this.server}:${this.port}/`, 'irc')
    this.ws.addEventListener('open', () => {
      console.log('opened')
      this.ws.send('PASS oauth:REDACTED')
      this.ws.send('NICK nomodbot')
      this.ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership')
      this.ws.send('JOIN #satsaa')
    })
    this.ws.addEventListener('message', (data) => {
      if (data.data.startsWith('PING')) {
        this.ws.send('PONG')
        console.log('PING PONG')
        return
      }
      console.log(`"${data.data}"`)
    })
    this.ws.addEventListener('close', (code, reason) => {
      console.log(`Connection closed`)
      console.log(code)
      console.log(reason)
    })
  }

  join (channel) {
    this.ws.send(`JOIN #${channel}`)
  }

  part (channel) {
    this.ws.send(`PART #${channel}`)
  }
}

class channel {
  constructor (client, channel) {
    this.client = client
    this.name = channel
  }

  join () {
    this.client.ws.send(`JOIN #${this.name}`)
  }

  part () {
    this.client.ws.send(`PART #${this.name}`)
  }

  send (msg) {
    this.client.ws.send(`PRIVMSG #${this.name} ${msg}`)
  }
}
