import WebSocket from 'ws'
import Channel from './Channel'
import Expector from './expector'
import parse from './parser'
import * as u from './util'

export interface TwitchClientOptions {
  username: string,
  password: string,
  server?: string,
  port?: number,
  secure?: boolean,
}

/**
 * A client for interacting with Twitch servers
 */
export default class TwitchClient {

  get ready() {
    if (this.ws && this.ws.readyState === 1) return true
    return false
  }
  public ws?: WebSocket
  public expector: Expector

  private username: string
  private password: string
  private server: string
  private secure: boolean
  private port: number
  private channels: {[x: string]: Channel}

  /**
   * Twitch client
   * @param options 
   */
  constructor(options: TwitchClientOptions) {
    this.username = options.username
    this.password = options.password
    this.server = u.get(options.server, 'irc-ws.chat.twitch.tv')
    this.secure = u.get(options.secure, false)
    this.port = u.get(options.port, this.secure ? 443 : 80)

    this.expector = new Expector()

    this.channels = {}

    this.expector.expect({ cmd: 'PING' }, { once: false }, () => {
      this.send('PONG')
      console.log('PING PONG')
    })
    setTimeout(this._pingLoop.bind(this), 5 * 60000 * (Math.random() * 0.10 + 0.9))
  }

  public connect() {
    if (this.ws && this.ws.readyState !== 1) return
    console.log('attempting to connect')
    this.ws = new WebSocket(`${this.secure ? 'wss' : 'ws'}://${this.server}:${this.port}/`, 'irc')
    this.ws.onopen = this.onOpen.bind(this)
    this.ws.onmessage = this.onMessage.bind(this)
    this.ws.onerror = this.onError.bind(this)
    this.ws.onclose = this.onClose.bind(this)
  }

  /**
   * Send `data` over connection
   * @param data 
   * @param cb Call when data is sent
   */
  public send(data: any, cb?: (err?: Error) => void): void {
    if (this.ws && this.ws.readyState === 1) {
      cb ? this.ws.send(data, cb) : this.ws.send(data)
    }
  }

  /** Join `channel` */
  public join(channel: string) {
    this.send(`JOIN #${channel}`)
    if (!this.channels[channel]) {
      this.channels[channel] = (new Channel(this, channel))
    }
    this.channels[channel].active = true
  }

  /** Leave `channel` */
  public part(channel: string) {
    this.send(`PART #${channel}`)
    if (this.channels[channel]) this.channels[channel].active = false
  }

  /** Send `msg` to `channel` */
  public privMsg(channel: string, msg: string) {
    this.send(`PRIVMSG #${channel} ${msg}`)
  }

  public onOpen(event: { target: WebSocket }): void {
    console.log('opened')
    this.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership') // Before login so globaluserstate is received
    this.send(`PASS ${this.password}`)
    this.send(`NICK ${this.username}`)
  }

  public onMessage(event: { data: WebSocket.Data, type: string, target: WebSocket }): void {
    if (typeof event.data === 'string') {
      event.data.split('\r\n').forEach((msgStr) => {
        const message = parse(msgStr)
        if (message === null) return
        console.log(message)

        const parseRes = parse(msgStr)
        if (parseRes !== null) this.expector.receive(parseRes)
      })
    } else throw (new Error('NON STRING DATA'))
  }

  public onClose(event: { wasClean: boolean, code: number, reason: string, target: WebSocket }): void {
    console.log(`Connection closed: ${event.code}, ${event.reason}`)
    delete this.ws
  }

  public onError(event: {error: any, message: string, type: string, target: WebSocket }): void {
    console.error(event.error)
  }

  public _pingLoop() {
    this.send('PING')
    this.expector.expect({ cmd: 'PING' }, { timeout: 15 * 60000 }, (expired) => {
      if (this.ws && this.ws.readyState === 1) {
        if (expired) {
          console.log('Closing websocket due to ping timeout')
          this.ws.close()
        } else console.log('PONG PING')
      }
    })

    setTimeout(this._pingLoop.bind(this), 5 * 60000 * (Math.random() * 0.10 + 0.9))
  }
}
