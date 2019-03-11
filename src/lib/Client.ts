import { EventEmitter } from 'events'
import * as fs from 'fs'
import WebSocket from 'ws'
import Expector from './expector'
import parse, { IrcMessage } from './parser'
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
export default class TwitchClient extends EventEmitter {
  public opts: TwitchClientOptions
  public get ready() { return this.ws && this.ws.readyState === 1 }
  public expector: Expector
  public ws?: WebSocket
  public timeout: any

  private messageTypes: any

  /**
   * Twitch client
   * @param options 
   */
  constructor(options: TwitchClientOptions) {
    super()
    this.opts = {
      username: options.username,
      password: options.password,
      server: u.get(options.server, 'irc-ws.chat.twitch.tv'),
      secure: u.get(options.secure, false),
      port: u.get(options.port, options.secure ? 443 : 80),
    }
    this.timeout = u.get(options.defaultTimeout, 5000)
    this.expector = new Expector()

    this.messageTypes = JSON.parse(fs.readFileSync('./misc/seenMessageTypes.json', {encoding: 'utf8'}))
    setInterval(() => { if (this.ws) this.ws.send('PING') }, 5 * 60 * 1000)
    setInterval(() => {
      fs.writeFileSync('./misc/seenMessageTypes.json', JSON.stringify(this.messageTypes, null, 2))
    }, 10 * 1000)
  }

  public connect() {
    if (this.ws && this.ws.readyState !== 1) return
    console.log('attempting to connect')
    this.ws = new WebSocket(`${this.opts.secure ? 'wss' : 'ws'}://${this.opts.server}:${this.opts.port}/`, 'irc')
    this.ws.onopen = this.onOpen.bind(this)
    this.ws.onmessage = this.onMessage.bind(this)
    this.ws.onerror = this.onError.bind(this)
    this.ws.onclose = this.onClose.bind(this)
  }

  /** Join `channel` */
  public join(channels: string | string[]) {
    if (!Array.isArray(channels)) channels = [channels]
    channels.forEach((channel) => {
      this.send(`JOIN ${channel}`)
    })
  }

  /** Leave `channel` */
  public part(channels: string | string[]) {
    if (!Array.isArray(channels)) channels = [channels]
    channels.forEach((channel) => {
      this.send(`PART ${channel}`)
    })
  }

  /** Send `msg` to `channel` */
  public privMsg(channel: string, msg: string) {
    this.send(`PRIVMSG #${channel} :${msg}`)
  }

  /**
   * Send `data` over the connection
   * @param data 
   * @param cb Call when data is sent
   */
  public send(data: any, cb?: (err?: Error) => void): void {
    if (this.ws && this.ws.readyState === 1) {
      cb ? this.ws.send(data, cb) : this.ws.send(data)
    }
  }

  private onOpen(event: { target: WebSocket }): void {
    console.log('Connected')
    this.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership') // Before login so globaluserstate is received
    this.send(`PASS ${this.opts.password}`)
    this.send(`NICK ${this.opts.username}`)
    this.send(`USER ${this.opts.username} 8 * :${this.opts.username}`)
  }

  private onMessage(event: { data: WebSocket.Data, target: WebSocket, type: string }): void {
    if (typeof event.data === 'string') {
      event.data.split('\r\n').forEach((msgStr) => {
        const message = parse(msgStr)
        if (message === null) return
        // Document message types
        if (message.cmd !== null) {
          // .noticeIds
          if (message.cmd === 'NOTICE' && typeof message.tags['msg-id'] === 'string') {
            const tag3 = message.tags['msg-id'].toString()
            if (!this.messageTypes.userNoticeIds[tag3]) this.messageTypes.userNoticeIds[tag3] = { __count__: 1}
            else this.messageTypes.userNoticeIds[tag3].__count__++
            for (const tag in message.tags) {
              if (message.tags.hasOwnProperty(tag)) {
                const commandObj = this.messageTypes.userNoticeIds[tag3]
                if (!commandObj[tag]) commandObj[tag] = 1
                else commandObj[tag]++
              }
            }
          } else if (message.cmd === 'USERNOTICE' && typeof message.tags['msg-id'] === 'string') {
            const tag3 = message.tags['msg-id'].toString()
            if (!this.messageTypes.noticeIds[tag3]) this.messageTypes.noticeIds[tag3] = { __count__: 1}
            else this.messageTypes.noticeIds[tag3].__count__++
            for (const tag in message.tags) {
              if (message.tags.hasOwnProperty(tag)) {
                const commandObj = this.messageTypes.noticeIds[tag3]
                if (!commandObj[tag]) commandObj[tag] = 1
                else commandObj[tag]++
              }
            }
          }

        // .commands
          if (!this.messageTypes.commands[message.cmd]) this.messageTypes.commands[message.cmd] = { __count__: 1}
          else this.messageTypes.commands[message.cmd].__count__++
          for (const tag in message.tags) {
            if (message.tags.hasOwnProperty(tag)) {
              const commandObj = this.messageTypes.commands[message.cmd]
              if (!commandObj[tag]) commandObj[tag] = 1
              else commandObj[tag]++
            }

          }
        }

        // Functionality
        if (message.cmd !== 'PRIVMSG') {
          console.log(message.cmd)
          console.log(message)
        }

        const parseRes = parse(msgStr)
        if (parseRes !== null) this.expector.receive(parseRes)
      })
    } else throw (new Error('NON STRING DATA'))
  }
  private onError(event: { error: any, message: string, target: WebSocket, type: string }): void {
    if (!this.ws) return
    console.error(event.error)
    this.ws.close()
  }

  private onClose(event: { code: number, reason: string, target: WebSocket , wasClean: boolean }): void {
    console.log(`Connection closed: ${event.code}, ${event.reason}`)
    this.ws = undefined
  }

  private handleMessage(message: IrcMessage) {
    if (message === null || !this.ws) return
// tslint:disable-next-line: no-all-duplicated-branches
    switch (message.cmd) {
      case '001': // <prefix> 001 <you> :Welcome, GLHF!
        this.emit('welcome')
        break
      case '002': // <prefix> 002 <you> :Your host is tmi.twitch.tv
      case '003': // <prefix> 003 <you> :This server is rather new
      case '004': // <prefix> 004 <you> :-
      case '366': // :nomodbot.<prefix> 366 <you> #nymn :End of /NAMES list
      case '372': // <prefix> 372 <you> :You are in a maze of twisty passages, all alike.
      case '375': // <prefix> 375 <you> :-
      case '376': // <prefix> 376 <you> :>
        break
      case '353': // :nomodbot.<prefix> 353 <you> = #<channel> :<user1> <user2> ... <userN>
        this.emit('join')
        break
      case 'CAP':
        this.emit('capabilities')
        break
      case 'MODE': // :jtv MODE #<channel> +o||-o <user>
        break
      case 'JOIN': // :<user>!<user>@<user>.tmi.twitch.tv JOIN #<channel>
        this.emit('join')
        break
      case 'PART': // :<user>!<user>@<user>.tmi.twitch.tv PART #<channel>
        this.emit('part')
        break
      case 'CLEARCHAT': // @ban-duration=10;room-id=62300805;target-user-id=274274870;tmi-sent-ts=1551880699566 <prefix> CLEARCHAT #<channel> :<user>
        break
      case 'USERSTATE': // @badges=;color=#008000;display-name=NoModBot;emote-sets=0,326755;mod=0;subscriber=0;user-type=
        break
      case 'ROOMSTATE': // <tags> :tmi.twitch.tv ROOMSTATE #<channel>
        // broadcaster-lang=;emote-only=0;followers-only=-1;r9k=0;rituals=0;room-id=62300805;slow=0;subs-only=0
        break
      case 'GLOBALUSERSTATE': // <tags> <prefix> GLOBALUSERSTATE
        // badges=;color=#008000;display-name=NoModBot;emote-sets=0,326755;user-id=266132990;user-type= <prefix> GLOBALUSERSTATE
        break
      case 'HOSTTARGET':
        // HOSTTARGET #<channel> :<targetchannel> -
        // HOSTTARGET #<channel> :- 0
        // Host off has ":- 0"?
        break
      case 'PRIVMSG': // @userstate :<user>!<user>@<user>.tmi.twitch.tv PRIVMSG #<channel> :<message>
        break
      case 'WHISPER': // @userstate :<user>!<user>@<user>.tmi.twitch.tv WHISPER <you> :<message>
        break

      case 'PING':
        this.ws.send('PONG')
        break
      case 'PONG':
        this.emit('pong')
        break
      case 'USERNOTICE': // <tags> <prefix> USERNOTICE #<channel> :<message>
        // switch
        break
      case 'NOTICE': // <tags> <prefix> NOTICE #<channel> :<message>
        // switch
        break
      case 'RECONNECT':
        this.emit('reconnect')
        break
      case 'CLEARMSG':
      case 'SERVERCHANGE':
        // NEED MORE INFO
        break
      case '421': // Unknown command
        this.emit('unknown')
        break
      default:
        break
    }
  }
}
/*
001           Welcome message by server

CAP * ACK     Server acknowledges that you have requested capabilities
:(<twitch.tv/tags twitch.tv/commands twitch.tv/membership>)

003           Tells nuffing
002           Tells nuffing
004           Tells nuffing
375           Tells nuffing
376           Tells nuffing
372           Tells nuffing
*/
