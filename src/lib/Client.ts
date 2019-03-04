import WebSocket from 'ws'
import Channel from './Channel'
import Expector from './expector'
import parse from './parser'
import * as u from './util'

export interface TwitchClientOptions {
  readonly username: string,
  readonly password: string,
  readonly server?: string,
  readonly secure?: boolean,
  readonly port?: number,
  readonly defaultTimeout?: number,
}

/**
 * A client for interacting with Twitch servers
 */
export default class TwitchClient {

  public get ready() { return this.ws && this.ws.readyState === 1 }
  public expector: Expector
  public ws?: WebSocket
  public timeout: any

  private username: string
  private password: string
  private port: number
  private secure: boolean
  private server: string
  private channels: {[x: string]: Channel}
  private expectIds: number[]

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
    this.timeout = u.get(options.defaultTimeout, 5000)
    this.expector = new Expector()
    this.channels = {}
    this.expectIds = []

    this.expector.expect({ cmd: 'PING' }, { once: false  }, () => {
      this.send('PONG')
    })
    setTimeout(this.pingLoop.bind(this), 5 * 60000 * (Math.random() * 0.10 + 0.9))
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

  private onClose(event: { code: number, reason: string, target: WebSocket , wasClean: boolean }): void {
    console.log(`Connection closed: ${event.code}, ${event.reason}`)
    this.ws = undefined
  }

  private onError(event: { error: any, message: string, target: WebSocket, type: string }): void {
    if (!this.ws) return
    console.error(event.error)
    this.ws.close()
  }

  private onMessage(event: { data: WebSocket.Data, target: WebSocket, type: string }): void {
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

  private onOpen(event: { target: WebSocket }): void {
    console.log('Connected')
    this.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership') // Before login so globaluserstate is received
    this.send(`PASS ${this.password}`)
    this.send(`NICK ${this.username}`)
    this.expectIds.push(this.expector.expect({ cmd: 'CAP', params: ['*', 'ACK']}, {timeout: 5000}, (exp) => {
      if (exp) console.log('Capabilities TIMEDOUT')
      else console.log('Capabilities gotten')
    }))
    this.expectIds.push(this.expector.expect({ cmd: '001'}, { timeout: this.timeout }, (exp) => {
      if (exp) console.log('We aint in')
      else console.log('We in')
    }))
  }

  private pingLoop() {
    this.send('PING')
    this.expector.expect({ cmd: 'PONG' }, { timeout: 15 * 60000 }, (expired) => {
      if (this.ws && this.ws.readyState === 1 && expired) {
        console.log('Closing websocket due to ping timeout')
        this.ws.close()
      }
    })
    setTimeout(this.pingLoop.bind(this), 5 * 60000 * (Math.random() * 0.10 + 0.9))
  }
}
