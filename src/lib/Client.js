const u = require('./util')
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
    this.server = u.get(options.server, 'irc-ws.chat.twitch.tv')
    this.secure = u.get(options.secure, false)
    this.port = u.get(options.port, this.secure ? 443 : 80)

    this._channels = {}
    this._expects = []
    this._expectId = 0

    this.expect({ cmd: 'PING' }, () => {
      this.send('PONG')
      console.log('PING PONG')
    }, { once: false })
    setTimeout(this._pingLoop.bind(this), 5 * 60000 * (Math.random() * 0.10 + 0.9))
  }

  connect () {
    if (this.ws && this.ws.readyState !== 0) return
    console.log({ a: 1, b: 2 })
    console.log('attempting to connect')
    this.ws = new WebSocket(`${this.secure ? 'wss' : 'ws'}://${this.server}:${this.port}/`, 'irc')
    this.ws.addEventListener('open', () => {
      console.log('opened')
      this.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership') // Before login so globaluserstate is received
      this.send(`PASS ${this.password}`)
      this.send(`NICK ${this.username}`)
    })
    this.ws.addEventListener('message', (this.onMessage.bind(this)))
    this.ws.addEventListener('close', (code, reason) => {
      console.log(`Connection closed`)
      console.log(code)
      console.log(reason)
    })
  }

  /**
   * Send `data` over connection
   * @param {*} data 
   * @param {(data: boolean, message: string)} cb Call when data is sent
   */
  send (data, cb) {
    if (this.ws && this.ws.readyState === 1) {
      cb ? this.ws.send(data, cb) : this.ws.send(data)
    }
  }

  onMessage (data) {
    data.data.split('\r\n').forEach(msgStr => {
      var message = parser(msgStr)
      if (message === null) return
      console.log(message)

      // Expects
      if (this._expects.length) {
        let now = Date.now()
        for (let i = 0; i < this._expects.length; i++) {
          const element = this._expects[i]

          // Test for match
          if (matchKeys(element.match, message, { matchValues: element.values })) {
            console.log(`MATCHED`)
            element.cb(false, message)
            if (element.once) {
              if (element.timeout) clearTimeout(element.timeout)
              this._expects.splice(i)
              i--
            }
          }
        }
      }
    })
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
   * @param {(expired:boolean, message?:string)} cb Called when timedout or matchingmessage is received
   * 
   * @param {object} [options]
   * @param {boolean} [options.values=true] If values should be matched
   * @param {number | null} [options.timeout=null] Timeout after this ms and callback with `expired` = true. Timeouts are checked on message received
   * @param {boolean} [options.once=true] Whether or not to return after first match
   * 
   * @returns {number} Identifier for this entry
   */
  expect (match, cb, options = {}) {
    let id = this._expectId++
    this._expects.push({
      id: id,
      match: match,
      cb: cb,
      values: u.get(options.values, true),
      once: u.get(options.once, true),
      timeout: !options.timeout ? null : setTimeout(() => {
        cb(true)
        this.unExpect(id)
      }, options.timeout)
    })
    return id
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
    this.send(`JOIN #${channel}`)
    if (!this._channels[channel]) {
      this._channels[channel] = (new Channel(this, channel))
    }
    this._channels[channel].active = true
  }

  /** Leave `channel` */
  part (channel) {
    this.send(`PART #${channel}`)
    if (this._channels[channel]) this._channels[channel].active = false
  }

  /** Send `msg` to `channel` */
  privMsg (channel, msg) {
    this.send(`PRIVMSG #${channel} ${msg}`)
  }

  _pingLoop () {
    this.send('PING')
    this.expect({ cmd: 'PING' }, (expired) => {
      if (expired) {
        console.log('Closing websocket due to ping timeout')
        this.ws.close()
      } else console.log('PONG PING')
    }, { timeout: 15 * 60000 })
    setTimeout(this._pingLoop.bind(this), 5 * 60000 * (Math.random() * 0.10 + 0.9))
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
