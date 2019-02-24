
const WebSocket = require('ws')

/**
 * A client for interacting with Twitch servers
 */
module.exports = class TwitchClient {
  /**
   * Twitch client
   * @param {Object} options
   * @param {string} options.username Twitch username (lowcase)
   * @param {string} options.password Password? Oauth token: "oauth:<token>"
   * @param {string} options.server Server url. E.G. "irc-ws.chat.twitch.tv"
   * @param {number} options.port Port of the server
   * @param {boolean} options.secure Use SSL
   */
  constructor (options) {
    this.username = options.username || console.error('No username!')
    this.password = options.password || console.error('No password!')
    this.server = options.server || 'irc-ws.chat.twitch.tv'
    this.port = options.port || 80
    this.secure = options.secure || false
    this.channels = {}
  }

  connect () {
    console.log('attempting to connect')
    this.ws = new WebSocket(`${this.secure ? 'wss' : 'ws'}://${this.server}:${this.port}/`, 'irc')
    this.ws.addEventListener('open', () => {
      console.log('opened')
      this.ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership') // Before login so globaluserstate is received
      this.ws.send(`PASS ${this.password}`)
      this.ws.send(`NICK ${this.username}`)
      this.join('satsaa')
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
    if (!this.channels[channel]) {
      this.channels[channel] = (new Channel(this, channel))
    }
    this.channels[channel].active = true
  }

  part (channel) {
    this.ws.send(`PART #${channel}`)
    if (this.channels[channel]) this.channels[channel].active = false
  }

  send (channel, msg) {
    this.ws.send(`PRIVMSG #${channel} ${msg}`)
  }
}

/**
 * Stores useful methods and channel specific data
 */
class Channel {
  /**
   * Channel instance
   * @param {any} client Twitch client instance
   * @param {string} channel Channel name
   */
  constructor (client, channel) {
    this.client = client
    this.channel = channel
    this.data = {}
    this.active = true
  }

  join () { return this.client.join(this.channel) }
  part () { return this.client.part(this.channel) }
  send (msg) { return this.client.send(this.channel, msg) }
}
