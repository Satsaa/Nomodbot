const WebSocket = require('ws')
const matchKeys = require('./matchKeys')
const parser = require('./parser')

/**
 * A client for interacting with Twitch servers
 */
module.exports = class TwitchClient {
  /**
   * Twitch client
   * @param {object} options
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
    this.port = options.port || options.secure ? 443 : 80
    this.secure = options.secure || false

    this._channels = {}
    this._expects = []
    this._expectId = 0

    this.expect({ cmd: 'PING' }, () => {
      this.ws.send('PONG')
      console.log('PING PONG')
    }, { once: false })
    setTimeout(this._pingLoop, 5 * 60000 * (Math.random() * 0.10 + 0.9))
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
    this.ws.addEventListener('message', (this.onMessage))
    this.ws.addEventListener('close', (code, reason) => {
      console.log(`Connection closed`)
      console.log(code)
      console.log(reason)
    })
  }

  onMessage (data) {
    var message = parser(data)
    console.log(`${message}`)

    // Expects
    if (this._expects.length) {
      let now = Date.now()
      for (let i = 0; i < this._expects.length; i++) {
        const element = this._expects[i]
        if (element.timeout !== null && element.timeout < now) {
          // Failed to get matching msg in time
          element.cb(element.expired, message)
          this._expects.splice(i)
          i--
          continue
        } else {
          // Test for match
          if (matchKeys(element.match, message, element.values)) {
            element.cb(false, message)
          }
        }
      }
    }
  }
  /**
   * Call `cb` when matching message is received
   * Place keys that are most likely to be incorrect first
   * 
   * @param {object} match Object containing matched keys
   * @param {{ [x: string]: string|true }} [match.tags] Key values pairs
   * @param {string | null} [match.prefix] Url prefix. Source of message
   * @param {string | null} [match.nick] Portion before ! in prefix
   * @param {string | null} [match.user] Portion before (at) in prefix
   * @param {string | null} [match.cmd] Command name
   * @param {string[]} [match.params] Command parameters
   * 
   * @param {(expired:boolean, message:string)} cb Called when timedout or matchingmessage is received
   * 
   * @param {object} [options]
   * @param {boolean} [options.values=true] If values should be matched
   * @param {number | null} [options.timeout=null] Timeout after this ms and callback with `expired` = true. Timeouts are checked on message received
   * @param {boolean} [options.once=true] Whether or not to return after first match
   * 
   * @returns {number} Identifier for this entry
   */
  expect (match, cb, options = {}) {
    this._expects.push({
      id: this._expectId,
      match: match,
      cb: cb,
      values: options.values || true,
      timeout: options.timeout || null,
      once: options.once || true
    })
    return this._expectId++
  }
  /**
   * Delete expect entries
   * @param {...number} ids Deleted by these ids
   */
  unExpect (...ids) {
    ids.forEach(id => {
      var index = this._expects.indexOf(id)
      if (index !== -1) delete this._expects[index]
    })
  }

  /** Join `channel` */
  join (channel) {
    this.ws.send(`JOIN #${channel}`)
    if (!this._channels[channel]) {
      this._channels[channel] = (new Channel(this, channel))
    }
    this._channels[channel].active = true
  }

  /** Leave `channel` */
  part (channel) {
    this.ws.send(`PART #${channel}`)
    if (this._channels[channel]) this._channels[channel].active = false
  }

  /** Send `msg` to `channel` */
  send (channel, msg) {
    this.ws.send(`PRIVMSG #${channel} ${msg}`)
  }

  _pingLoop () {
    this.ws.send('PING')
    this.expect({ cmd: 'PING' }, (expired) => {
      if (expired) console.log('Ping timedout...RECONNECT')
      else console.log('PONG PING')
    }, { once: false })
    setTimeout(this._pingLoop, 5 * 60000 * (Math.random() * 0.10 + 0.9))
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
