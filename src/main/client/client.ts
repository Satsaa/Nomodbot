import { EventEmitter } from 'events'
import * as fs from 'fs'

import StrictEventEmitter from 'strict-event-emitter-types'
import WebSocket from 'ws'

import deepClone from '../lib/deepClone'
import defaultKeys from '../lib/defaultKeys'
import eventTimeout from '../lib/eventTimeout'
import RateLimiter, { RateLimiterOptions } from '../lib/rateLimiter'
import * as u from '../lib/util'

import TwitchApi from './api'
import parse, { IrcMessage, PRIVMSG } from './parser'

interface Events {
  join: (channelId: number) => void
  part: (channelId: number) => void
  welcome: () => void
  userjoin: (channelId: number, user: string) => void
  userpart: (channelId: number, user: string) => void
  mod: (channelId: number, user: string, mod: boolean) => void
  chat: (channelId: number, userId: number, userstate: PRIVMSG['tags'], message: string, me: boolean, self: boolean, irc: PRIVMSG | undefined) => void
  whisper: (userId: number, message: string) => void
  hosttarget: (channelId: number, hostChannelId: number | undefined, viewerCount: number | undefined) => void
  timeout: (channelId: number, userId: number, duration: number) => void
  clearmsg: (channelId: number, targetMsgId: IrcMessage['tags']['target-msg-id'], tags: IrcMessage['tags'], message: string) => void
  ban: (channelId: number, userId: number) => void
  clear: (channelId: number) => void
  roomstate: (channelId: number, roomstate: IrcMessage['tags']) => void
  userstate: (channelId: number, userstate: IrcMessage['tags']) => void
  usernotice: (channelId: number, tags: IrcMessage['tags'], message?: string) => void
  notice: (channelId: number, tags: IrcMessage['tags'], message: string) => void
  pong: () => void

  // usernotice
  sub: (channelId: number, userId: number, streak: number | undefined, cumulative: number | undefined, tier: 1 | 2 | 3, gifted: boolean, message: string | undefined) => void
  subgift: (channelId: number, gifterId: number | undefined, targetId: number, tier: 1 | 2 | 3, total: number) => void
  massgift: (channelId: number, gifterId: number | undefined, count: number, tier: 1 | 2 | 3) => void
  raid: (channelId: number, targetId: number | undefined, viewerCount: number | undefined) => void
  ritual: (channelId: number, userId: number, ritualName: string, message: string) => void

  // websocket
  ws_open: (ws: WebSocket | undefined) => void
  ws_message: (ws: WebSocket | undefined) => void
  ws_error: (ws: WebSocket | undefined) => void
  ws_close: (ws: WebSocket | undefined) => void
}

export interface TwitchClientOptions {
  username: string
  password: string
  clientId: string
  clientSecret?: string | null
  server?: string
  secure?: boolean
  port?: number
  /** Client data will be loaded from and saved in this directory's "global" folder */
  dataRoot: string
  /** Client data will be loaded from and saved with this file name */
  dataFile?: string
  /** API cache data will be loaded from and saved with this file name */
  apiDataFile?: string
  logInfo?: boolean
  /** Log all messages received over the Websocket */
  logAll?: boolean
  /** Server might refuse to connect with fast intervals */
  reconnectInterval?: number
  /** Exit after this many reconnects without succesfully connecting */
  maxReconnects?: number
  minLatency?: number
  pingInterval?: number
  dupeAffix?: string
  maxMsgLength?: number
  /** Send a message in channel when client is connected */
  joinMessage?: null | {channelId: number, message: string}
  readonly msgRLOpts?: DeepReadonly<RateLimiterOptions>
  readonly whisperRLOpts?: DeepReadonly<RateLimiterOptions | RateLimiterOptions[]>
}

/**
 * A client for interacting with Twitch servers
 */
export default class TwitchClient {
  public opts: Required<TwitchClientOptions>
  public globaluserstate: {[x: string]: any}
  /** To provide accurate userjoin and userpart events, channel users must be tracked */
  public channelCache: {
    mods: {[channelId: number]: {[user: string]: true}}
    users: {[channelId: number]: {[user: string]: true}}
  }
  public clientData: {
    global: {whisperTimes: number[][], msgTimes: number[][]}
    channels: {[id: number]: {userstate: IrcMessage['tags'], phase: boolean}}
  }
  public ws?: WebSocket
  /** Ratelimited partial twitch API */
  public api: TwitchApi

  public on: StrictEventEmitter<EventEmitter, Events>['on']
  public once: StrictEventEmitter<EventEmitter, Events>['once']
  public prependListener: StrictEventEmitter<EventEmitter, Events>['prependListener']
  public prependOnceListener: StrictEventEmitter<EventEmitter, Events>['prependOnceListener']
  public removeListener: StrictEventEmitter<EventEmitter, Events>['removeListener']
  public emit: StrictEventEmitter<EventEmitter, Events>['emit']

  private rateLimiter: RateLimiter
  private whisperRateLimiter: RateLimiter

  private reconnecting: boolean
  private reconnects: number
  private latency: number
  private messageTypes: any

  /** Session store for joined channel ids */
  private ids: {[login: string]: number}
  /** Session store for joined channel login names */
  private channels: {[id: number]: string}

  /**
   * Twitch client
   * @param options 
   */
  constructor(options: TwitchClientOptions) {
    this.opts = {
      clientSecret: null,
      server: 'irc-ws.chat.twitch.tv',
      secure: false,
      port: u.get(options.port, options.secure ? 443 : 80),
      dataFile: 'clientData.json',
      logInfo: false,
      logAll: false,
      apiDataFile: 'apiCache.json',
      reconnectInterval: 10000,
      maxReconnects: 1000,
      minLatency: 800,
      pingInterval: 60000,
      dupeAffix: ' 󠀀', // E0000,
      maxMsgLength: 499,
      joinMessage: null,
      msgRLOpts: {
        duration: 30000,
        limit: 19,
        delay: 1200,
      },
      // 3 per second, up to 100 per minute; 40 accounts per day... uh sure
      whisperRLOpts: {
        duration: 60000,
        limit: 34,
        delay: 1050,
      },
      ...deepClone(options),
    }

    this.globaluserstate = {}
    this.channelCache = { mods: {}, users: {} }
    this.clientData = { global: { whisperTimes: [], msgTimes: [] }, channels: {} }

    fs.mkdirSync(`${this.opts.dataRoot}/global/`, { recursive: true })
    try {
      fs.accessSync(`${this.opts.dataRoot}/global/${this.opts.dataFile}`, fs.constants.R_OK | fs.constants.W_OK)
    } catch (err) {
      if (err.code === 'ENOENT') fs.writeFileSync(`${this.opts.dataRoot}/global/${this.opts.dataFile}`, '{}')
      else throw err
    }
    fs.accessSync(`${this.opts.dataRoot}/global/${this.opts.dataFile}`)
    defaultKeys(this.clientData, JSON.parse(fs.readFileSync(`${this.opts.dataRoot}/global/${this.opts.dataFile}`, 'utf8')))
    u.onExit(this.onExit.bind(this))

    // Do this isntead of using "extends" so event typings work
    const emitter = new EventEmitter()
    this.on = emitter.on
    this.once = emitter.once
    this.prependListener = emitter.prependListener
    this.prependOnceListener = emitter.prependOnceListener
    this.removeListener = emitter.removeListener
    this.emit = emitter.emit

    this.rateLimiter = new RateLimiter(this.opts.msgRLOpts)
    this.whisperRateLimiter = new RateLimiter(this.opts.whisperRLOpts)

    this.api = new TwitchApi({ clientId: this.opts.clientId, clientSecret: this.opts.clientSecret, dataRoot: this.opts.dataRoot })

    // Match rateLimiter's options length with times lengths
    // Make sure the times arrays are big enough
    this.rateLimiter.times.forEach((v, i) => {
      if (!this.clientData.global.msgTimes[i]) this.clientData.global.msgTimes.push([])
    })
    this.whisperRateLimiter.times.forEach((v, i) => {
      if (!this.clientData.global.whisperTimes[i]) this.clientData.global.whisperTimes.push([])
    })
    // Make sure the times arrays are not too big
    this.clientData.global.msgTimes.length = this.rateLimiter.times.length
    this.clientData.global.whisperTimes.length = this.whisperRateLimiter.times.length
    // Link the times array to clientData so it can be saved
    this.rateLimiter.times = this.clientData.global.msgTimes
    this.whisperRateLimiter.times = this.clientData.global.whisperTimes

    this.reconnecting = false
    this.reconnects = 0
    this.latency = 0
    // Doc file
    fs.mkdirSync('./misc/', { recursive: true })
    try {
      fs.accessSync('./misc/seenMessageTypes.json', fs.constants.R_OK | fs.constants.W_OK)
    } catch (err) {
      if (err.code === 'ENOENT') fs.writeFileSync('./misc/seenMessageTypes.json', '{}')
      else throw err
    }
    this.messageTypes = JSON.parse(fs.readFileSync('./misc/seenMessageTypes.json', { encoding: 'utf8' }))

    this.ids = {}
    this.channels = {}

    if (this.opts.joinMessage) setTimeout(() => { this.opts.joinMessage = null }, 30000)

    setTimeout(this.pingLoop.bind(this), this.opts.pingInterval * u.randomFloat(0.9, 1.0))
    setInterval(() => {
      fs.writeFileSync('./misc/seenMessageTypes.json', JSON.stringify(this.messageTypes, null, 2))
    }, 10 * 1000)
  }

  public get joinedChannels(): number[] {
    return Object.keys(this.channels).map(v => ~~v)
  }

  public async connect() {
    if (this.ws && this.ws.readyState !== 1) return
    console.log('attempting to connect')
    this.ws = new WebSocket(`${this.opts.secure ? 'wss' : 'ws'}://${this.opts.server}:${this.opts.port}/`, 'irc')
    this.ws.onopen = this.onOpen.bind(this)
    this.ws.onmessage = this.onMessage.bind(this)
    this.ws.onerror = this.onError.bind(this)
    this.ws.onclose = this.onClose.bind(this)
    return !(await eventTimeout(this, 'welcome', { timeout: this.getLatency() + 2000 })).timeout
  }

  /**
   * Send `data` over the connection
   * @param data 
   * @param cb Call when data is sent
   */
  public send(data: any, cb?: (err?: Error) => void): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.ws && this.ws.readyState === 1) {
        if (cb) this.ws.send(data, cb)
        else this.ws.send(data, (err) => { resolve(!err) }) // no error -> true
      } else { resolve(false) }
    })
  }

  /** Join `channelIds` */
  public async join(channelIds: number[], delay = 1000): Promise<boolean> {
    if (channelIds.length === 0) return true

    const res = await this.api._users({ id: channelIds })
    if (typeof res !== 'object') return false

    const promises: Array<ReturnType<typeof eventTimeout>> = []
    for (const user of res.data) {
      this.api.cacheUser(~~user.id, user.login, user.display_name)
      this.send(`JOIN #${user.login}`)
      promises.push(eventTimeout(this, 'join', { timeout: this.getLatency(), matchArgs: [~~user.id] }))
      if (delay) await u.asyncTimeout(delay)
    }
    return (await Promise.all(promises)).every(v => v.timeout === false)
  }

  /** Part `channelIds` */
  public async part(channelIds: number[], delay = 200): Promise<boolean> {
    if (channelIds.length === 0) return true

    const res = await this.api._users({ id: channelIds })
    if (typeof res !== 'object') return false

    const promises: Array<ReturnType<typeof eventTimeout>> = []
    for (const user of res.data) {
      this.send(`PART #${user.login}`)
      promises.push(eventTimeout(this, 'part', { timeout: this.getLatency(), matchArgs: [~~user.id] }))
      if (delay) await u.asyncTimeout(delay)
    }
    return (await Promise.all(promises)).every(v => v.timeout === false)
  }

  /** Send `msg` to `channelId` */
  public chat(channelId: number, msg: string, options: {command?: boolean} = {}) {
    return new Promise((resolve) => {
      msg = msg.replace(/\n/g, '')

      const login = this.channels[channelId]
      if (!login) return resolve(false)
      if (!this.clientData.channels[channelId]) return resolve(false)
      if (msg.length > this.opts.maxMsgLength) msg = msg.slice(0, this.opts.maxMsgLength)
      if (msg.endsWith(this.opts.dupeAffix)) msg = msg.substring(0, msg.length - 2) // Remove chatterino shit
      // msg = msg.replace(/ +(?= )/g, '') // replace multiple spaces with a single space
      if (!options.command) {
        if (!msg.match(/^(\/|\\|\.)me /)) { // allow actions
          if (msg.startsWith('/') || msg.startsWith('.') || msg.startsWith('\\')) {
            msg = ` ${msg}` // Adding a space before a command makes it show up in chat
          }
        }
      }

      const isCommand = Boolean(msg.match(/^[\/\\\.]/))
      // It is not possible to know if nmb has been unmodded before sending a message. (pubsub may tell this? Still would be too late?)
      // Being over basic limits and losing mod will cause the bot to be disconnected and muted for 30 or so minutes (not good)
      // 0 delay but normal limits per 30 sec could be safe for moderated channels !!!
      this.rateLimiter.queue(async () => {
        if (!isCommand) { // Anti duplication for non commands
          this.clientData.channels[channelId].phase = !this.clientData.channels[channelId].phase
          if (this.clientData.channels[channelId].phase) msg += this.opts.dupeAffix
        }
        this.send(`PRIVMSG #${login} :${msg}`)

        const res = await eventTimeout(this, isCommand ? 'notice' : 'userstate', {
          timeout: this.getLatency(), matchArgs: isCommand ? undefined : [channelId, { 'display-name': this.globaluserstate['display-name'] }],
        })
        if (res.timeout) { console.error(`[${await this.api.getLogin(channelId)}] Failed to send message: ${msg}`) } else {
          // Emit own messages
          const botId = await this.api.getId(this.opts.username)
          if (!botId) return this.failHandle(undefined, 'BOT ID')
          console.log(`[${await this.api.getLogin(channelId)}] bot: ${msg}`)
          this.emit('chat', channelId, botId, res.args[1] as PRIVMSG['tags'], msg, msg.search(/^(\.|\/|\\)me/) !== -1, true, undefined)
        }
        resolve(!res.timeout)
      })
    })
  }

  /** Whisper `msg` to `userId` */
  public async whisper(userId: number, msg: string) {
    msg = msg.replace(/\n/g, '')

    const login = await this.api.getLogin(userId)
    if (!login) return false
    return this.whisperRateLimiter.queue(() => {
      this.send(`PRIVMSG #${this.opts.username} :/w ${login} ${msg}`)
    })
  }

  private onOpen(event: { target: WebSocket }): void {
    this.emit('ws_open', this.ws)
    console.log('Connected')
    this.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership') // Before login so globaluserstate is received
    this.send(`PASS ${this.opts.password}`)
    this.send(`NICK ${this.opts.username}`)
    this.send(`USER ${this.opts.username} 8 * :${this.opts.username}`)
  }

  private onMessage(event: { data: WebSocket.Data, target: WebSocket, type: string }): void {
    this.emit('ws_message', this.ws)
    if (typeof event.data === 'string') {
      event.data.split('\r\n').forEach((msgStr) => {
        const msg = parse(msgStr)
        if (msg === null) return
        this.handleMessage(msg)
        this.doc(msg)
      })
    } else { throw new TypeError('NON STRING DATA') }
  }

  // Collect info about messages
  private doc(msg: IrcMessage) {
    if (msg.cmd !== null) {
      // tag types. Types are now in a predefined list
      // noticeIds
      if (msg.cmd === 'NOTICE' && typeof msg.tags['msg-id'] === 'string') {
        const tag3 = msg.tags['msg-id'].toString()
        if (!this.messageTypes.userNoticeIds) this.messageTypes.userNoticeIds = {}
        if (this.messageTypes.userNoticeIds[tag3]) this.messageTypes.userNoticeIds[tag3].__count__++
        else this.messageTypes.userNoticeIds[tag3] = { __count__: 1 }
        for (const tag in msg.tags) {
          if (msg.tags.hasOwnProperty(tag)) {
            const commandObj = this.messageTypes.userNoticeIds[tag3]
            if (commandObj[tag]) commandObj[tag]++
            else commandObj[tag] = 1
          }
        }
      } else if (msg.cmd === 'USERNOTICE' && typeof msg.tags['msg-id'] === 'string') {
        const tag3 = msg.tags['msg-id'].toString()
        if (tag3 === 'rewardgift') { // !!! Inspect reward gifts
          console.error('rewardgift!')
          console.log(msg)
        }
        if (!this.messageTypes.noticeIds) this.messageTypes.noticeIds = {}
        if (this.messageTypes.noticeIds[tag3]) this.messageTypes.noticeIds[tag3].__count__++
        else this.messageTypes.noticeIds[tag3] = { __count__: 1 }

        const commandObj = this.messageTypes.noticeIds[tag3]
        for (const tag in msg.tags) {
          if (msg.tags.hasOwnProperty(tag)) {
            if (commandObj[tag]) commandObj[tag]++
            else commandObj[tag] = 1
          }
        }
      }
      // commands
      if (!this.messageTypes.commands) this.messageTypes.commands = {}
      if (this.messageTypes.commands[msg.cmd]) this.messageTypes.commands[msg.cmd].__count__++
      else this.messageTypes.commands[msg.cmd] = { __count__: 1 }

      const commandObj = this.messageTypes.commands[msg.cmd]
      for (const tag in msg.tags) {
        if (msg.tags.hasOwnProperty(tag)) {
          if (commandObj[tag]) commandObj[tag]++
          else commandObj[tag] = 1
        }
      }
      if (!commandObj._paramlengths_) commandObj._paramlengths_ = {}
      if (commandObj._paramlengths_[msg.params.length]) commandObj._paramlengths_[msg.params.length]++
      else commandObj._paramlengths_[msg.params.length] = 1

      if (!commandObj._prefix_) commandObj._prefix_ = {}
      if (msg.prefix) commandObj._prefix_.prefix++
      else commandObj._prefix_.prefix = 1
      if (msg.user) commandObj._prefix_.user++
      else commandObj._prefix_.user = 1
      if (msg.nick) commandObj._prefix_.nick++
      else commandObj._prefix_.nick = 1
    }
  }

  private onError(event: { error: any, message: string, target: WebSocket, type: string }): void {
    console.error(event.error)
    this.emit('ws_error', this.ws)
    this.ws = undefined
    this.reconnect()
  }

  private onClose(event: { code: number, reason: string, target: WebSocket, wasClean: boolean }): void {
    console.log(`Connection closed: ${event.code}, ${event.reason}`)
    this.emit('ws_close', this.ws)
    this.ws = undefined
    this.ids = {}
    this.channels = {}
    this.reconnect()
  }

  private onExit() {
    if (!this.clientData) {
      console.warn('[Client] clientData not saved due to it being undefined!')
      return
    }
    try {
      fs.writeFileSync(`${this.opts.dataRoot}/global/${this.opts.dataFile}`, JSON.stringify(this.clientData, replacer, 2))
    } catch (err) {
      console.log('[Client] Could not save clientData:', err)
      console.warn('[Client] clientData:', JSON.stringify(this.clientData, null, 2))
    }
    function replacer(k: string, v: any) {
      if (!['userstate'].includes(k)) return v
    }
  }

  private setLatency(latency: number) {
    this.latency = latency * 1.5 + 300
    return this.latency
  }
  private getLatency() {
    return Math.max(this.latency, this.opts.minLatency)
  }

  /** Starts the ping loop */
  private async pingLoop() {
    setTimeout(this.pingLoop.bind(this), this.opts.pingInterval * u.randomFloat(0.9, 1.0))
    if (!this.ws || this.ws.readyState !== 1) return
    this.ws.send('PING')

    const start = Date.now()
    if ((await eventTimeout(this, 'pong', { timeout: this.getLatency() * 2 })).timeout) {
      console.log('Reconnecting because of ping timeout')
      this.reconnect()
    } else { this.setLatency(Date.now() - start) }
  }

  /** Tries to reconnect until succeeding */
  private async reconnect(interval: number = this.opts.reconnectInterval): Promise<void> {
    if (interval < 1000) throw new Error(`Too small interval: ${interval}`)
    if (this.opts.maxReconnects < this.reconnects++) throw new Error('Too many unsuccessful reconnects')
    if (this.reconnecting) return
    console.log(`Reconnecting in ${u.plural(Math.round(interval / 1000), 'second')}`)
    if (this.ws) this.ws.close()
    this.reconnecting = true
    await u.asyncTimeout(interval)

    const res = await this.connect()
    this.reconnecting = false
    if (!res) return this.reconnect(interval)
  }

  /** Log in console if logging irc messages is enabled */
  private ircLog(msg: any) {
    if (this.opts.logInfo) console.log(msg)
  }

  /** Handle mod gain/losing in `channelId` */
  private async mod(channelId: number, user: string, mod: boolean) {
    if (!this.channelCache.mods[channelId]) this.channelCache.mods[channelId] = {}
    if (mod) {
      if (this.channelCache.mods[channelId][user]) return
      else this.channelCache.mods[channelId][user] = true
    } else if (this.channelCache.mods[channelId][user]) {
      delete this.channelCache.mods[channelId][user]
    } else { return } // Not modded
    this.emit('mod', channelId, user, mod)
    this.ircLog(`${user} ${mod ? 'gains' : 'loses'} moderator in ${await this.api.getDisplay(channelId)}`)
  }

  /** Handle a `user` joining 'channelId' */
  private async userJoin(channelId: number, user: string) {
    if (!this.channelCache.users[channelId]) this.channelCache.users[channelId] = {}
    if (this.channelCache.users[channelId][user]) return // Already joined
    this.ircLog(`${user} joins ${await this.api.getDisplay(channelId)}`)
    this.emit('userjoin', channelId, user)
    this.channelCache.users[channelId][user] = true
  }
  /** Handle a `user` parting 'channelId' */
  private async userPart(channelId: number, user: string) {
    if (!this.channelCache.users[channelId]) this.channelCache.users[channelId] = {}
    if (!this.channelCache.users[channelId][user]) return // Not joined
    this.ircLog(`${user} parts ${await this.api.getDisplay(channelId)}`)
    this.emit('userpart', channelId, user)
    delete this.channelCache.users[channelId][user]
  }

  /** Announce a handled failure of message handling */
  private failHandle(msg: undefined | IrcMessage, message: any) {
    console.log(new Error(message))
    if (msg) console.log(msg)
  }

  /** Handle an IRCv3 message */
  private async handleMessage(msg: IrcMessage) {
    if (msg === null) return

    let channel: string
    let channelId: void | number

    if (this.opts.logAll) console.log(msg)

    switch (msg.cmd) {
      case '001': // <prefix> 001 <you> :Welcome, GLHF!
        this.reconnects = 0
        this.ircLog('Bot is welcome')
        this.join(Object.keys(this.clientData.channels).map(v => Number(v)))
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
        channel = msg.params[2].slice(1)
        channelId = await this.api.getId(channel)
        if (!channelId) return this.failHandle(msg, msg.cmd)
        for (const user of msg.params[3].split(' ')) this.userJoin(channelId, user)
        break
      case 'CAP':
        break
      case 'MODE': // :jtv MODE #<channel> +o||-o <user>
        channel = msg.params[0].slice(1)
        channelId = await this.api.getId(channel)
        if (!channelId) return this.failHandle(msg, msg.cmd)
        this.mod(channelId, msg.params[2], msg.params[1] === '+o')
        break
      case 'JOIN': // :<user>!<user>@<user>.tmi.twitch.tv JOIN #<channel>
        channel = msg.params[0].slice(1)
        channelId = await this.api.getId(channel)
        if (!channelId) return this.failHandle(msg, msg.cmd)
        if (msg.user === this.opts.username) {
          this.clientData.channels[channelId] = { userstate: {}, phase: false }
          this.channels[channelId] = channel
          this.ids[channel] = channelId
          this.api.loadChannelCache(channelId)
          this.emit('join', channelId)
          if (this.opts.joinMessage && this.opts.joinMessage.channelId === channelId) {
            this.chat(channelId, this.opts.joinMessage.message)
            this.opts.joinMessage = null
          }
        }
        this.userJoin(channelId, msg.user || 'undefined')
        break
      case 'PART': // :<user>!<user>@<user>.tmi.twitch.tv PART #<channel>
        channel = msg.params[0].slice(1)
        channelId = await this.api.getId(channel)
        if (!channelId) return this.failHandle(msg, msg.cmd)
        if (msg.user === this.opts.username) {
          delete this.channels[channelId]
          delete this.ids[channel]
          this.api.unloadChannelCache(channelId)
          this.emit('part', channelId)
          delete this.clientData.channels[channelId]
        }
        this.userPart(channelId, msg.user || 'undefined')
        break
      case 'CLEARCHAT': {
        // @ban-duration=10;room-id=62300805;target-user-id=274274870;tmi-sent-ts=1551880699566 <prefix> CLEARCHAT #<channel> :<user>
        // @room-id=61365582;tmi-sent-ts=1553598835278 :tmi.twitch.tv CLEARCHAT #satsaa
        channel = msg.params[0].slice(1)
        channelId = await this.api.getId(channel)
        if (!channelId) return this.failHandle(msg, msg.cmd)
        if (msg.params[1]) {
          this.ircLog(`${msg.params[1]} ${typeof msg.tags['ban-duration'] === 'number'
            ? `is timed out for ${msg.tags['ban-duration']} seconds`
            : 'is banned'}`)
        } else {
          this.ircLog(`Chat of ${channel} cleared`)
        }
        if (!msg.params[1]) {
          this.emit('clear', channelId)
          return
        }

        const userId = await this.api.getId(msg.params[1])
        if (!userId) return this.failHandle(msg, msg.cmd)
        if (typeof msg.tags['ban-duration'] === 'number') this.emit('timeout', channelId, userId, msg.tags['ban-duration'])
        else this.emit('ban', channelId, userId)
        break
      }
      case 'ROOMSTATE': // <tags> :tmi.twitch.tv ROOMSTATE #<channel>
        channel = msg.params[0].slice(1)
        channelId = await this.api.getId(channel)
        if (!channelId) return this.failHandle(msg, msg.cmd)
        if (msg.tags['emote-only'] === 1) { this.ircLog(`${channel} is in emote only mode`) }
        if (msg.tags['followers-only'] !== -1) { this.ircLog(`${channel} is in follower only mode (${msg.tags['followers-only']})`) }
        if (msg.tags['subs-only'] === 1) { this.ircLog(`${channel} is in subscriber only mode`) }
        if (msg.tags.slow === 1) { this.ircLog(`${channel} is in slow mode`) }
        this.emit('roomstate', channelId, msg.tags)
        // broadcaster-lang=;emote-only=0;followers-only=-1;r9k=0;rituals=0;room-id=62300805;slow=0;subs-only=0
        break
      case 'USERSTATE': // <tags> <prefix> USERSTATE #<channel>
        // @badges=;color=#008000;display-name=NoModBot;emote-sets=0,326755;mod=0;subscriber=0;user-type=
        channel = msg.params[0].slice(1)
        channelId = await this.api.getId(channel)
        if (!channelId) return this.failHandle(msg, msg.cmd)
        this.clientData.channels[channelId].userstate = { ...this.clientData.channels[channelId].userstate, ...msg ? msg.tags : {} }
        if ((msg.tags || {}).badges) this.mod(channelId, this.opts.username, Boolean(msg.tags.badges!.moderator))
        this.emit('userstate', channelId, msg.tags)
        break
      case 'GLOBALUSERSTATE': // <tags> <prefix> GLOBALUSERSTATE
        this.globaluserstate = { ...this.globaluserstate, ...msg.tags }
        // badges=;color=#008000;display-name=NoModBot;emote-sets=0,326755;user-id=266132990;user-type= <prefix> GLOBALUSERSTATE
        break
      case 'HOSTTARGET':
        channel = msg.params[0].slice(1)
        channelId = await this.api.getId(channel)
        if (!channelId) return this.failHandle(msg, msg.cmd)
        if (msg.params[1]) {
          const targetId = await this.api.getId(msg.params[1].slice(0, -2))
          if (!targetId) return this.failHandle(msg, msg.cmd)
          this.emit('hosttarget', channelId, targetId, msg.params[2] === undefined ? undefined : ~~msg.params[2])
        } else { this.emit('hosttarget', channelId, undefined, msg.params[2] === undefined ? undefined : ~~msg.params[2]) }
        // HOSTTARGET #<channel> :<targetchannel> -
        // HOSTTARGET #<channel> :- 0
        // Host off has ":- 0"?
        break
      case 'PRIVMSG': { // @userstate :<user>!<user>@<user>.tmi.twitch.tv PRIVMSG #<channel> :<message>
        channel = msg.params[0].slice(1)
        channelId = await this.api.getId(channel)
        if (!channelId) return this.failHandle(msg, msg.cmd)
        if (((msg.tags || {}).badges || {}).moderator && msg.user) {
          this.mod(channelId, msg.user, Boolean(msg.tags.badges!.moderator))
        }

        const _msg = msg.params[1].endsWith(this.opts.dupeAffix)
          ? msg.params[1].substring(0, msg.params[1].length - this.opts.dupeAffix.length)
          : msg.params[1]
        this.ircLog(`[${channel}] ${msg.tags['display-name']}: ${_msg}`)
        this.api.cacheUser(msg.tags['user-id']!, msg.user!, String(msg.tags['display-name']!))
        if (_msg.startsWith('ACTION ')) {
          this.emit('chat', channelId, msg.tags['user-id']!, msg.tags as PRIVMSG['tags'], _msg.slice(8, -1), true, msg.user === this.opts.username, msg as PRIVMSG)
        } else { this.emit('chat', channelId, msg.tags['user-id']!, msg.tags as PRIVMSG['tags'], _msg, false, msg.user === this.opts.username, msg as PRIVMSG) }
        break
      }
      case 'WHISPER': // @userstate :<user>!<user>@<user>.tmi.twitch.tv WHISPER <you> :<message>
        if (!msg.tags['user-id']) return this.failHandle(msg, 'Whisper had no user-id')
        this.emit('whisper', msg.tags['user-id'], msg.params[1])
        break
      case 'PING':
        this.send('PONG')
        break
      case 'PONG':
        this.emit('pong')
        break
      case 'RECONNECT':
        this.reconnect()
        break
      case 'CLEARMSG': // @login=<login>;target-msg-id=<target-msg-id> :tmi.twitch.tv CLEARMSG #<channel> :<message>
        channel = msg.params[0].slice(1)
        channelId = await this.api.getId(channel)
        if (!channelId) return this.failHandle(msg, msg.cmd)
        this.emit('clearmsg', channelId, msg.tags['target-msg-id'], msg.tags, msg.params[1])
        break
      case 'SERVERCHANGE':
        // NEED MORE INFO
        console.warn('SERVERCHANGE INFO')
        console.log(msg)
        break
      case '421': // Unknown command
        console.warn('Unknown command')
        break
      case 'USERNOTICE': // <tags> <prefix> USERNOTICE #<channel> :<message>
        channel = msg.params[0].slice(1)
        channelId = await this.api.getId(channel)
        if (!channelId) return this.failHandle(msg, msg.cmd)
        this.emit('usernotice', channelId, msg.tags, msg.params[1])
        switch (msg.tags['msg-id']) {
          case 'resub':
          case 'sub': {
            const userId = msg.tags['user-id']
            const streak = msg.tags['msg-param-months']
            const cumulative = msg.tags['msg-param-cumulative-months']
            const tier = msg.tags['msg-param-sub-plan'] === 2000 ? 2 : msg.tags['msg-param-sub-plan'] === 3000 ? 3 : 1
            if (!userId) return this.failHandle(msg, 'Sub notice had no "user-id"')
            this.emit('sub', channelId, userId, streak, cumulative, tier, false, msg.params[1])
            break
          }
          case 'subgift':
          case 'anonsubgift': {
            const gifterId = msg.tags['msg-param-origin-id']
            const targetId = msg.tags['msg-param-recipient-id']
            const streak = msg.tags['msg-param-months']
            const total = msg.tags['msg-param-sender-count']
            const tier = msg.tags['msg-param-sub-plan'] === 2000 ? 2 : msg.tags['msg-param-sub-plan'] === 3000 ? 3 : 1
            if (!targetId) this.failHandle(msg, 'Subgift notice had no "msg-param-recipient-id"')
            if (!total) this.failHandle(msg, 'Subgift notice had no "msg-param-sender-count"')
            if (!targetId || !total) return
            this.emit('subgift', channelId, gifterId, targetId, tier, total)
            this.emit('sub', channelId, targetId, streak, undefined, tier, true, undefined)
            break
          }
          case 'submysterygift':
          case 'anonsubmysterygift': {
            const gifterId = msg.tags['msg-param-origin-id']
            const total = msg.tags['msg-param-mass-gift-count']
            const tier = msg.tags['msg-param-sub-plan'] === 2000 ? 2 : msg.tags['msg-param-sub-plan'] === 3000 ? 3 : 1
            if (!total) return this.failHandle(msg, 'Submysterygift notice had no "msg-param-sender-count"')
            this.emit('massgift', channelId, gifterId, total, tier)
            break
          }
          case 'charity':
            break
          case 'unraid':
            this.emit('raid', channelId, undefined, undefined)
            break
          case 'raid': {
            const viewerCount = msg.tags['viewer-count']
            const userId = await this.api.getId(`${msg.tags.login}`)
            if (!userId) return this.failHandle(msg, msg.tags['msg-id'])
            this.emit('raid', channelId, userId, viewerCount)
            break
          }
          case 'ritual': {
            const id = await this.api.getId(`${msg.tags.login}`)
            if (!id) return this.failHandle(msg, msg.tags['msg-id'])
            this.emit('ritual', channelId, id, `${msg.tags['msg-param-ritual-name']}`, msg.params[1])
            break
          }
          // Not actual subscriptions? Advertisement of sorts. Subtember
          case 'giftpaidupgrade':
          case 'anongiftpaidupgrade':
            break
          case 'crate':
          case 'rewardgift':
          case 'purchase':
          case 'firstcheer':
          case 'anoncheer':
          case 'bitsbadgetier':
            break
          default:
            console.warn('COULDN\'T HANDLE THIS INCREDIBLE USERNOTICE:')
            console.log(msg)
            break
        }
        break
      case 'NOTICE': // <tags> <prefix> NOTICE #<channel> :<message>
        channel = msg.params[0].slice(1)
        channelId = await this.api.getId(channel)
        if (!channelId) {
          const last = msg.params[msg.params.length - 1] || ''
          if (last === 'Login authentication failed'
            || last === 'Login unsuccessful'
            || last === 'Improperly formatted auth') {
            console.error(last)
            process.exit(1)
          }
          return this.failHandle(msg, msg.cmd)
        }
        this.emit('notice', channelId, msg.tags, msg.params[1])
        if (msg.tags['msg-id'] === 'msg_ratelimit') this.ircLog('Rate limited')
        switch (msg.tags['msg-id']) {
          case 'msg_ratelimit':
            this.ircLog('Rate limited')
            break
          case 'msg_timedout': {
            const duration = typeof msg.params[1] === 'string' ? ~~msg.params[1].match(/(\d*)[a-zA-Z .]*$/)![1] : 0
            const userId = await this.api.getId(this.opts.username)
            if (!userId) return this.failHandle(msg, msg.tags['msg-id'])
            this.emit('timeout', channelId, userId, duration)
            break
          }
          case 'msg_banned': {
            const userId = await this.api.getId(this.opts.username)
            if (!userId) return this.failHandle(msg, msg.tags['msg-id'])
            this.emit('ban', channelId, userId)
            break
          }
          default: // Handled in the near to infinite future
            if ([
              'subs_on', 'subs_off', 'emote_only_on', 'emote_only_off', 'slow_on', 'slow_off', 'followers_on_zero', 'invalid_user ',
              'followers_on', 'followers_off', 'r9k_on', 'r9k_off', 'host_on', 'host_off', 'room_mods', 'no_mods', 'msg_channel_suspended',
              'already_banned', 'bad_ban_admin', 'bad_ban_broadcaster', 'bad_ban_global_mod', 'bad_ban_self', 'bad_ban_staff', 'usage_ban',
              'ban_success', 'usage_clear', 'usage_mods', 'mod_success', 'usage_mod', 'bad_mod_banned', 'bad_mod_mod', 'unmod_success',
              'usage_unmod', 'bad_unmod_mod', 'color_changed', 'usage_color', 'turbo_only_color', 'commercial_success', 'usage_commercial',
              'bad_commercial_error', 'hosts_remaining', 'bad_host_hosting', 'bad_host_rate_exceeded', 'bad_host_error', 'usage_host',
              'already_r9k_on', 'usage_r9k_on', 'already_r9k_off', 'usage_r9k_off', 'timeout_success', 'already_subs_off', 'usage_subs_off',
              'already_subs_on', 'usage_subs_on', 'already_emote_only_off', 'usage_emote_only_off', 'already_emote_only_on',
              'usage_emote_only_on', 'usage_slow_on', 'usage_slow_off', 'usage_timeout', 'bad_timeout_admin', 'bad_timeout_broadcaster',
              'bad_timeout_duration', 'bad_timeout_global_mod', 'bad_timeout_self', 'bad_timeout_staff', 'unban_success', 'usage_unban',
              'bad_unban_no_ban', 'usage_unhost', 'not_hosting', 'whisper_invalid_login', 'whisper_invalid_self', 'unrecognized_cmd',
              'no_permission', 'whisper_limit_per_min', 'whisper_limit_per_sec', 'whisper_restricted_recipient', 'host_target_went_offline',
            ]
              .includes(msg.tags['msg-id'])) { this.ircLog(`${channel}: ${msg.params[1]}`) } else {
              console.warn('COULDN\'T HANDLE THIS INCREDIBLE NOTICE:')
              console.log(msg)
            }
            break
        }
        break
      default:
        console.warn('COULDN\'T HANDLE THIS INCREDIBLE MESSAGE:')
        console.log(msg)
        break
    }
  }
}
