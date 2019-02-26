const WebSocket = require('ws')
const matchKeys = require('./matchKeys')
const parser = require('./parser')

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
    setTimeout(() => {
      this.ws.send('PING')
    }, 5 * 60000)
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

  /**
   * Call `cb` when matching message is received
   * @param {{cmd?:string|null, nick?:string|null, params?:string[], prefix?:string|null, tags?:{[x:string]:string|true}, user?:string|null}} match Object containing matched keys
   * @param {boolean} matchValues If values should be matched
   * @param {(timedOut:number, message:number)} cb Function called when matching message is received
   * @param {number} timeout Stop waiting after this many ms and don't callback
   */
  expect (match, matchValues, cb, timeout = 3000) {
    // when message received: test for match
    if (matchKeys(match, message, matchValues)) cb(timedOut, message)
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
 * Stores channel specific methods and data
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
