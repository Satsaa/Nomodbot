import { EventEmitter } from 'events'
import * as fs from 'fs'
import WebSocket from 'ws'
import Expector from './expector'
import parse, { IrcMessage } from './parser'
import RateLimiter, { RateLimiterOptions } from './RateLimiter'

import * as u from './util'

export interface TwitchClientOptions {
  username: string,
  password: string,
  server?: string,
  secure?: boolean,
  port?: number,
  logIrc?: boolean,
  defaultTimeout?: number,
  // trackAllUserstates?: boolean,
  rateLimiterOptions?: RateLimiterOptions,
  modRateLimiterOptions?: RateLimiterOptions,
}

/**
 * A client for interacting with Twitch servers
 */
export default class TwitchClient extends EventEmitter {
  public get ready() { return this.ws && this.ws.readyState === 1 }
  public opts: Required<TwitchClientOptions>
  public globaluserstate: {[x: string]: any} // userstates: {[x: string]: any}
  public channels: {[x: string]: undefined | {[x: string]: any, userstates: IrcMessage['tags']}}
  public expector: Expector
  public ws?: WebSocket
  private rateLimiter: RateLimiter
  private modRateLimiter: RateLimiter

  private messageTypes: any

  /**
   * Twitch client
   * @param options 
   */
  constructor(options: TwitchClientOptions) {
    super()
    this.opts = {
      server: 'irc-ws.chat.twitch.tv',
      secure: false,
      port: u.get(options.port, options.secure ? 443 : 80),
      logIrc : false,
      defaultTimeout: 2000,
      // trackAllUserstates: false,
      ...options,
      rateLimiterOptions: {
        duration: 30000,
        limit: 19,
        queueSize: null,
        delay: 1200,
        ...options.rateLimiterOptions,
      },
      modRateLimiterOptions: {
        duration: 30000,
        limit: 99,
        queueSize: null,
        delay: 250,
        ...options.modRateLimiterOptions,
      },
    }
    this.globaluserstate = {}
    this.channels = {}
    this.expector = new Expector()
    this.rateLimiter = new RateLimiter(this.opts.rateLimiterOptions)
    this.modRateLimiter = new RateLimiter(this.opts.modRateLimiterOptions)

    this.messageTypes = JSON.parse(fs.readFileSync('./misc/seenMessageTypes.json', {encoding: 'utf8'}))
    setTimeout(this.pingLoop.bind(this), 5 * 60 * 1000 * u.randomFloat(0.9, 1.0))
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
  public msg(channel: string, msg: string, allowCommand: boolean = false) {
    msg = msg.replace(/ +(?= )/g, '') // replace multiple spaces with a single space
    if (!allowCommand) {
      if (!msg.match(/^(\/|\\|\.)me /)) {  // allow actions
        if (msg.charAt(0) === '/' || msg.charAt(0) === '.' || msg.charAt(0) === '\\') {
          msg = ' ' + msg
        }
      }
    }

    /*if (mod){
      this.modRateLimiter.queue(() => {
        this.send(`PRIVMSG ${channel} :${msg}`)
      })
    } else {
      this.rateLimiter.queue(() => {
        this.send(`PRIVMSG ${channel} :${msg}`)
      })
    }*/
    this.rateLimiter.queue(() => {
      this.send(`PRIVMSG ${channel} :${msg}`)
    })
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
    this.emit('ws open')
    console.log('Connected')
    this.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership') // Before login so globaluserstate is received
    this.send(`PASS ${this.opts.password}`)
    this.send(`NICK ${this.opts.username}`)
    this.send(`USER ${this.opts.username} 8 * :${this.opts.username}`)
  }

  private onMessage(event: { data: WebSocket.Data, target: WebSocket, type: string }): void {
    this.emit('ws message')
    if (typeof event.data === 'string') {
      event.data.split('\r\n').forEach((msgStr) => {
        const message = parse(msgStr)
        if (message === null) return
          // Functionality
        this.handleMessage(message)

        if (message.cmd !== null) {

          // Document message types
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
            const commandObj = this.messageTypes.noticeIds[tag3]
            for (const tag in message.tags) {
              if (message.tags.hasOwnProperty(tag)) {
                if (!commandObj[tag]) commandObj[tag] = 1
                else commandObj[tag]++
              }
            }
          }
          // .commands
          if (!this.messageTypes.commands[message.cmd]) this.messageTypes.commands[message.cmd] = { __count__: 1}
          else this.messageTypes.commands[message.cmd].__count__++
          const commandObj = this.messageTypes.commands[message.cmd]
          for (const tag in message.tags) {
            if (message.tags.hasOwnProperty(tag)) {
              if (!commandObj[tag]) commandObj[tag] = 1
              else commandObj[tag]++
            }
          }
          if (!commandObj._paramlengths_) commandObj._paramlengths_ = {}
          if (!commandObj._paramlengths_[message.params.length]) commandObj._paramlengths_[message.params.length] = 1
          else commandObj._paramlengths_[message.params.length]++

          if (!commandObj._prefix_) commandObj._prefix_ = {}

          if (!message.prefix) commandObj._prefix_.prefix = 1
          else commandObj._prefix_.prefix++

          if (!message.user) commandObj._prefix_.user = 1
          else commandObj._prefix_.user++

          if (!message.nick) commandObj._prefix_.nick = 1
          else commandObj._prefix_.nick++
        }
      })
    } else throw (new Error('NON STRING DATA'))
  }
  private onError(event: { error: any, message: string, target: WebSocket, type: string }): void {
    this.emit('ws error')
    console.error(event.error)
    this.ws = undefined
  }

  private onClose(event: { code: number, reason: string, target: WebSocket , wasClean: boolean }): void {
    this.emit('ws close')
    console.log(`Connection closed: ${event.code}, ${event.reason}`)
  }

  private pingLoop() {
    if (this.ws) this.ws.send('PING')
    setTimeout(this.pingLoop.bind(this), 5 * 60 * 1000 * u.randomFloat(0.9, 1.0))
  }

  private ircLog(msg: any) {
    if (this.opts.logIrc) console.warn(msg)
  }

  private handleMessage(msg: IrcMessage) {
    if (msg === null) return
    switch (msg.cmd) {
      case '001': // <prefix> 001 <you> :Welcome, GLHF!
        this.ircLog('Bot is welcome')
        this.emit('welcome', msg)
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
        // this.emit('userjoin')
        break
      case 'CAP':
        // this.emit('capabilities')
        break
      case 'MODE': // :jtv MODE #<channel> +o||-o <user>
        this.ircLog(`${msg.params[2]} ${msg.params[1] === '+o' ? 'gains' : 'loses'} moderator in ${msg.params[0]}`)
        this.emit('mode', msg, msg.params[0], msg.params[1] === '+o', msg.params[2])
        break
      case 'JOIN': // :<user>!<user>@<user>.tmi.twitch.tv JOIN #<channel>
        this.ircLog(`${msg.user} joins ${msg.params[0]}`)
        if (msg.user === this.opts.username) {
          this.channels[msg.params[0]] = {userstates: {}}
          this.emit('join', msg, msg.params[0])
        }
        this.emit('userjoin', msg, msg.params[0], msg.user)
        break
      case 'PART': // :<user>!<user>@<user>.tmi.twitch.tv PART #<channel>
        this.ircLog(`${msg.user} parts ${msg.params[0]}`)
        if (msg.user === this.opts.username) {
          this.emit('part', msg, msg.params[0])
          this.channels[msg.params[0]] = undefined
        }
        this.emit('userpart', msg, msg.params[0], msg.user)
        break
      case 'CLEARCHAT': // @ban-duration=10;room-id=62300805;target-user-id=274274870;tmi-sent-ts=1551880699566 <prefix> CLEARCHAT #<channel> :<user>
        this.ircLog(`${msg.params[1]} ${typeof msg.tags['ban-duration'] === 'number'
          ? 'is timed out for ' + msg.tags['ban-duration'] + ' seconds'
          : 'is banned'}`)
        this.emit('clearchat', msg)
        break
      case 'ROOMSTATE': // <tags> :tmi.twitch.tv ROOMSTATE #<channel>
        if (msg.tags['emote-only'] === 1) { this.ircLog(`${msg.params[0]} is in emote only mode`)}
        if (msg.tags['followers-only'] !== -1) { this.ircLog(`${msg.params[0]} is in follower only mode (${msg.tags['followers-only']})`)}
        if (msg.tags['subs-only'] === 1) { this.ircLog(`${msg.params[0]} is in subscriber only mode`)}
        if (msg.tags.slow === 1) { this.ircLog(`${msg.params[0]} is in slow mode`)}
        this.emit('roomstate', msg)
        // broadcaster-lang=;emote-only=0;followers-only=-1;r9k=0;rituals=0;room-id=62300805;slow=0;subs-only=0
        break
      case 'USERSTATE': // <tags> <prefix> USERSTATE #<channel>
          // @badges=;color=#008000;display-name=NoModBot;emote-sets=0,326755;mod=0;subscriber=0;user-type=
          // Non null assertion (!) used because of a compiler issue
        this.channels[msg.params[0]]!.userstates = {...this.channels[msg.params[0]]!.userstates, ...msg.tags}
        this.emit('userstate', msg)
        break
      case 'GLOBALUSERSTATE': // <tags> <prefix> GLOBALUSERSTATE
        this.globaluserstate = {...this.globaluserstate, ...msg.tags}
        this.emit('globaluserstate', msg)
        // badges=;color=#008000;display-name=NoModBot;emote-sets=0,326755;user-id=266132990;user-type= <prefix> GLOBALUSERSTATE
        break
      case 'HOSTTARGET':
        this.emit('hosttarget', msg)
        // HOSTTARGET #<channel> :<targetchannel> -
        // HOSTTARGET #<channel> :- 0
        // Host off has ":- 0"?
        break
      case 'PRIVMSG': // @userstate :<user>!<user>@<user>.tmi.twitch.tv PRIVMSG #<channel> :<message>
        this.ircLog(`[${msg.params[0]}] ${msg.tags['display-name']}: ${msg.params[1]}`)
        if (msg.params[1].startsWith('ACTION ')) this.emit('message', msg, msg.params[0], msg.tags, msg.params[1].slice(8, -1), true)
        else this.emit('message', msg, msg.params[0], msg.tags, msg.params[1], false, msg)
        break
      case 'WHISPER': // @userstate :<user>!<user>@<user>.tmi.twitch.tv WHISPER <you> :<message>
        this.emit('whisper', msg)
        break
      case 'PING':
        this.ws!.send('PONG')
        break
      case 'PONG':
        this.emit('pong', msg)
        break
      case 'USERNOTICE': // <tags> <prefix> USERNOTICE #<channel> :<message>
        this.emit('usernotice', msg)
        // switch
        break
      case 'NOTICE': // <tags> <prefix> NOTICE #<channel> :<message>
        this.emit('notice', msg)
        // switch
        break
      case 'RECONNECT':
        this.emit('reconnect', msg)
        break
      case 'CLEARMSG':
        this.emit('clearmsg', msg)
        break
      case 'SERVERCHANGE':
        // NEED MORE INFO
        console.warn('SERVERCHANGE INFO', msg)
        break
      case '421': // Unknown command
        this.emit('unknown', msg)
        break
      default:
        console.warn(msg)
        break
    }
  }
}
