import { EventEmitter } from 'events'
import * as fs from 'fs'
import StrictEventEmitter from 'strict-event-emitter-types'
import WebSocket from 'ws'
import defaultKeys from './defaultKeys'
import eventTimeout from './eventTimeout'
import parse, { IrcMessage } from './parser'
import RateLimiter, { RateLimiterOptions } from './RateLimiter'
import * as u from './util'

interface Events {
  join: (channel: string) => void
  part: (channel: string) => void
  userjoin: (channel: string, user: string) => void
  userpart: (channel: string, user: string) => void
  chat: (channel: string, user: string, userstate: IrcMessage['tags'], message: string, me: boolean, self: boolean) => void
  mod: (channel: string, user: string, mod: boolean) => void
  welcome: () => void
  clearmsg: (channel: string, targetMsgId: IrcMessage['tags']['target-msg-id'], tags: IrcMessage['tags'], message: string) => void
  clear: (channel: string) => void
  timeout: (channel: string, user: string, duration: number) => void
  ban: (channel: string, user: string) => void
  roomstate: (channel: string, roomstate: IrcMessage['tags']) => void
  userstate: (channel: string, userstate: IrcMessage['tags']) => void
  globaluserstate: (channel: string, globaluserstate: IrcMessage['tags']) => void
  hosttarget: (channel: string, hostChannel: string | null, viewerCount: number | null) => void
  whisper: (user: string, message: string) => void
  pong: () => void
  usernotice: (channel: string, tags: IrcMessage['tags'], message?: string) => void
  notice: (channel: string, tags: IrcMessage['tags'], message: string) => void

  // usernotice
  sub: (channel: string, user: string, streak: number, cumulative: number | null, plan: string | number, gifted: boolean , message: string) => void
  massgift: (channel: string, user: string, count: number) => void
  raid: (channel: string, target: string | null, viewerCount: number | null) => void
  ritual: (channel: string, user: string | null, ritualName: string, message: string) => void

  // websocket
  ws_open: (ws: WebSocket | undefined) => void
  ws_message: (ws: WebSocket | undefined) => void
  ws_error: (ws: WebSocket | undefined) => void
  ws_close: (ws: WebSocket | undefined) => void
}

export interface TwitchClientOptions {
  username: string,
  password: string,
  server?: string,
  secure?: boolean,
  port?: number,
  /** Client data will be loaded and saved in this directory as clientData.json */
  dataDir?: null | string,
  logIrc?: boolean,
  /** Server might refuse to connect with fast intervals */
  reconnectInterval?: number,
  minLatency?: number,
  pingInterval?: number,
  dupeAffix?: string,
  maxMsgLength?: number,
  readonly msgRLOpts?: Readonly<RateLimiterOptions>,
  readonly whisperRLOpts?: Readonly<RateLimiterOptions | RateLimiterOptions[]>,
}

/**
 * A client for interacting with Twitch servers
 */
export default class TwitchClient {
  public opts: Required<TwitchClientOptions>
  public globaluserstate: {[x: string]: any}
  /** To provide accurate userjoin and userpart events, channel users must be tracked */
  public channelCache: { mods: {[channel: string]: {[user: string]: true}}, users: {[channel: string]: {[user: string]: true}}}
  public clientData: {
    global: {whisperTimes: number[][], msgTimes: number[][]},
    channels: {[channel: string]: {userstate: IrcMessage['tags'], phase: boolean}},
  }
  public ws?: WebSocket

  public on: TwitchClient['emitter']['on']
  public once: TwitchClient['emitter']['once']
  public prependListener: TwitchClient['emitter']['prependListener']
  public prependOnceListener: TwitchClient['emitter']['prependOnceListener']
  public removeListener: TwitchClient['emitter']['removeListener']
  public emit: TwitchClient['emitter']['emit']
  /** Emitter for usernotices */
  private emitter: StrictEventEmitter<EventEmitter, Events>

  private rateLimiter: RateLimiter
  private whisperRateLimiter: RateLimiter

  private reconnecting: boolean
  private latency: number
  private messageTypes: any

  /**
   * Twitch client
   * @param options 
   */
  constructor(options: TwitchClientOptions) {
    this.opts = {
      server: 'irc-ws.chat.twitch.tv',
      secure: false,
      port: u.get(options.port, options.secure ? 443 : 80),
      dataDir: null,
      logIrc : false,
      reconnectInterval: 10000,
      minLatency: 800,
      pingInterval: 60000,
      dupeAffix: ' \u206D',
      maxMsgLength: 499,
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
      ...options,
    }

    this.globaluserstate = {}
    this.channelCache = {mods: {}, users: {}}
    this.clientData = {global: {whisperTimes: [], msgTimes: []} , channels: {}}
    if (this.opts.dataDir !== null) {
      if (this.opts.dataDir.endsWith('/')) this.opts.dataDir += '/'
      fs.mkdirSync(this.opts.dataDir, {recursive: true})
      try {
        fs.accessSync(`${this.opts.dataDir}clientData.json`, fs.constants.R_OK | fs.constants.W_OK)
      } catch (err) {
        if (err.code === 'ENOENT') fs.writeFileSync(`${this.opts.dataDir}clientData.json`, '{}')
        else throw err
      }
      fs.accessSync(`${this.opts.dataDir}clientData.json`)
      defaultKeys(this.clientData, JSON.parse(fs.readFileSync(`${this.opts.dataDir}clientData.json`, 'utf8')))
      u.onExit(this.onExit.bind(this))
    }

    // Do this isntead of using "extends" so event typings work
    this.emitter = new EventEmitter()
    this.on = this.emitter.on
    this.once = this.emitter.once
    this.prependListener = this.emitter.prependListener
    this.prependOnceListener = this.emitter.prependOnceListener
    this.removeListener = this.emitter.removeListener
    this.emit = this.emitter.emit

    this.rateLimiter = new RateLimiter(this.opts.msgRLOpts)
    this.whisperRateLimiter = new RateLimiter(this.opts.whisperRLOpts)

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
    this.latency = 0
    this.messageTypes = JSON.parse(fs.readFileSync('./misc/seenMessageTypes.json', {encoding: 'utf8'}))

    setTimeout(this.pingLoop.bind(this), this.opts.pingInterval * u.randomFloat(0.9, 1.0))
    setInterval(() => {
      fs.writeFileSync('./misc/seenMessageTypes.json', JSON.stringify(this.messageTypes, null, 2))
    }, 10 * 1000)
  }

  public async connect() {
    if (this.ws && this.ws.readyState !== 1) return
    console.log('attempting to connect')
    this.ws = new WebSocket(`${this.opts.secure ? 'wss' : 'ws'}://${this.opts.server}:${this.opts.port}/`, 'irc')
    this.ws.onopen = this.onOpen.bind(this)
    this.ws.onmessage = this.onMessage.bind(this)
    this.ws.onerror = this.onError.bind(this)
    this.ws.onclose = this.onClose.bind(this)
    return !((await eventTimeout(this, 'welcome', {timeout: this.getLatency() + 2000})).timeout)
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
        else this.ws.send(data, (err) => {resolve(!err)}) // no error -> true
      } else resolve(false)
    })
  }

  /** Join `channels` */
  public async join(channels: string | string[]): Promise<boolean> {
    if (!Array.isArray(channels)) channels = [channels]
    const promises: Array<ReturnType<typeof eventTimeout>> = []
    for (const channel of channels) {
      this.send(`JOIN ${channel}`)
      promises.push(eventTimeout(this, 'join', {timeout: this.getLatency(), matchArgs: [channel]}))
    }
    return (await Promise.all(promises)).every(v => v.timeout === false)
  }

  /** Leave `channels` */
  public async part(channels: string | string[]): Promise<boolean> {
    if (!Array.isArray(channels)) channels = [channels]
    const promises: Array<ReturnType<typeof eventTimeout>> = []
    for (const channel of channels) {
      this.send(`PART ${channel}`)
      promises.push(eventTimeout(this, 'part', {timeout: this.getLatency(), matchArgs: [channel]}))
    }
    return (await Promise.all(promises)).every(v => v.timeout === false)
  }

  /** Send `msg` to `channel` */
  public chat(channel: string, msg: string, options: {command?: boolean, cutTheLine?: boolean} = {}) {
    return new Promise((resolve) => {
      if (!this.clientData.channels[channel]) return resolve(false)
      if (msg.length > this.opts.maxMsgLength) msg = msg.slice(0, this.opts.maxMsgLength)
      if (msg.endsWith(' \u206D')) msg = msg.substring(0, msg.length - 2) // Remove chatterino shit
      msg = msg.replace(/ +(?= )/g, '') // replace multiple spaces with a single space
      if (!options.command) {
        if (!msg.match(/^(\/|\\|\.)me /)) {  // allow actions
          if (msg.charAt(0) === '/' || msg.charAt(0) === '.' || msg.charAt(0) === '\\') {
            msg = ' ' + msg // Adding a space before a command makes it show up in chat
          }
        }
      }
      // It is not possible to know if nmb has been unmodded before sending a message. (pubsub may tell this? Still would be too late?)
      // Being over basic limits and losing mod will cause the bot to be disconnected and muted for 30 or so minutes (not good)
      this.rateLimiter.queue(async () => {
        this.clientData.channels[channel].phase = !this.clientData.channels[channel].phase
        if (this.clientData.channels[channel].phase) msg += this.opts.dupeAffix
        this.send(`PRIVMSG ${channel} :${msg}`)
        const res = await eventTimeout(this, 'userstate', {
          timeout: this.getLatency(), matchArgs: [channel, {'display-name': this.globaluserstate['display-name']}]})
        if (!res.timeout) {
          // Emit own messages
          this.emit('chat', channel, this.opts.username, res.args[1] as IrcMessage['tags'], msg, msg.search(/^(\.|\/|\\)me/) !== -1, true)
        }
        resolve(!res.timeout)
      })
    })
  }

  /** Whisper `msg` to `user` */
  public whisper(user: string, msg: string) {
    this.whisperRateLimiter.queue(() => {
      this.send(`PRIVMSG #${this.opts.username} :/w ${user} ${msg}`)
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
    } else throw (new Error('NON STRING DATA'))
  }

  private doc(msg: IrcMessage) {
    if (msg.cmd !== null) {
      // noticeIds
      if (msg.cmd === 'NOTICE' && typeof msg.tags['msg-id'] === 'string') {
        const tag3 = msg.tags['msg-id'].toString()
        if (!this.messageTypes.userNoticeIds[tag3]) this.messageTypes.userNoticeIds[tag3] = { __count__: 1}
        else this.messageTypes.userNoticeIds[tag3].__count__++
        for (const tag in msg.tags) {
          if (msg.tags.hasOwnProperty(tag)) {
            const commandObj = this.messageTypes.userNoticeIds[tag3]
            if (!commandObj[tag]) commandObj[tag] = 1
            else commandObj[tag]++
          }
        }
      } else if (msg.cmd === 'USERNOTICE' && typeof msg.tags['msg-id'] === 'string') {
        const tag3 = msg.tags['msg-id'].toString()
        if (!this.messageTypes.noticeIds[tag3]) this.messageTypes.noticeIds[tag3] = { __count__: 1}
        else this.messageTypes.noticeIds[tag3].__count__++
        const commandObj = this.messageTypes.noticeIds[tag3]
        for (const tag in msg.tags) {
          if (msg.tags.hasOwnProperty(tag)) {
            if (!commandObj[tag]) commandObj[tag] = 1
            else commandObj[tag]++
          }
        }
      }
      // commands
      if (!this.messageTypes.commands[msg.cmd]) this.messageTypes.commands[msg.cmd] = { __count__: 1}
      else this.messageTypes.commands[msg.cmd].__count__++
      const commandObj = this.messageTypes.commands[msg.cmd]
      for (const tag in msg.tags) {
        if (msg.tags.hasOwnProperty(tag)) {
          if (!commandObj[tag]) commandObj[tag] = 1
          else commandObj[tag]++
        }
      }
      if (!commandObj._paramlengths_) commandObj._paramlengths_ = {}
      if (!commandObj._paramlengths_[msg.params.length]) commandObj._paramlengths_[msg.params.length] = 1
      else commandObj._paramlengths_[msg.params.length]++

      if (!commandObj._prefix_) commandObj._prefix_ = {}
      if (!msg.prefix) commandObj._prefix_.prefix = 1
      else commandObj._prefix_.prefix++
      if (!msg.user) commandObj._prefix_.user = 1
      else commandObj._prefix_.user++
      if (!msg.nick) commandObj._prefix_.nick = 1
      else commandObj._prefix_.nick++
    }
  }

  private onError(event: { error: any, message: string, target: WebSocket, type: string }): void {
    console.error(event.error)
    this.emit('ws_error', this.ws)
    this.ws = undefined
    this.reconnect()
  }

  private onClose(event: { code: number, reason: string, target: WebSocket , wasClean: boolean }): void {
    console.log(`Connection closed: ${event.code}, ${event.reason}`)
    this.emit('ws_close', this.ws)
    this.ws = undefined
    this.reconnect()
  }

  private onExit() {
    console.log('[Client] Saving clientData')
    if (!this.opts.dataDir) {
      console.warn('CLIENTDATA COULD NOT BE SAVED! PRINTING DATA!\n', JSON.stringify(this.clientData, null, 2))
    } else {
      try {
        fs.writeFileSync(`${this.opts.dataDir}clientData.json`, JSON.stringify(this.clientData, replacer, 2))
        console.log('[Client] Saved clientData')
      } catch (err) {
        console.log('[Client] Could not save clientData:', err)
        console.warn('[Client] clientData:', JSON.stringify(this.clientData, null, 2))
      }
    }
    function replacer(k: string, v: any) {
      if (['userstate'].indexOf(k) !== -1) return undefined
      else return v
    }
  }

  private setLatency(latency: number) {
    return this.latency = latency * 1.5 + 300
  }
  private getLatency() {
    return Math.max(this.latency, this.opts.minLatency)
  }

  private async pingLoop() {
    setTimeout(this.pingLoop.bind(this), this.opts.pingInterval * u.randomFloat(0.9, 1.0))
    if (!this.ws || this.ws.readyState !== 1) return
    this.ws.send('PING')
    const start = Date.now()
    if ((await eventTimeout(this, 'pong', {timeout: this.getLatency() * 2})).timeout) {
      this.reconnect()
    } else this.setLatency(Date.now() - start)
  }

  private async reconnect(interval: number = this.opts.reconnectInterval): Promise<void> {
    if (this.reconnecting) return
    console.log(`Reconnecting in ${u.plural(Math.round(interval / 1000), 'second')}`)
    if (this.ws) this.ws.close()
    this.reconnecting = true
    await u.timeout(interval)
    const res = await this.connect()
    if (!res) {
      this.reconnecting = false
      return this.reconnect(interval)
    }
    this.reconnecting = false
  }

  private ircLog(msg: any) {
    if (this.opts.logIrc) console.log(msg)
  }

  private mod(channel: string, user: string, mod: boolean) {
    if (!this.channelCache.mods[channel]) this.channelCache.mods[channel] = {}
    if (mod) {
      if (this.channelCache.mods[channel][user]) return
    } else if (!this.channelCache.mods[channel][user]) return // Not modded

    this.emit('mod', channel, user, mod)
    this.ircLog(`${user} ${mod ? 'gains' : 'loses'} moderator in ${channel}`)
  }

  private userJoin(channel: string, user: string) {
    if (!this.channelCache.users[channel]) this.channelCache.users[channel] = {}
    if (this.channelCache.users[channel][user]) return // Already joined
    this.ircLog(`${user} joins ${channel}`)
    this.emit('userjoin', channel, user)
    this.channelCache.users[channel][user] = true
  }
  private userPart(channel: string, user: string) {
    if (!this.channelCache.users[channel]) this.channelCache.users[channel] = {}
    if (!this.channelCache.users[channel][user]) return // Not joined
    this.ircLog(`${user} parts ${channel}`)
    this.emit('userpart', channel, user)
    delete this.channelCache.users[channel][user]
  }

  private handleMessage(msg: IrcMessage) {
    if (msg === null) return
    switch (msg.cmd) {
      case '001': // <prefix> 001 <you> :Welcome, GLHF!
        this.ircLog('Bot is welcome')
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
        msg.params[3].split(' ').forEach((user) => { this.userJoin(msg.params[2], user) })
        break
      case 'CAP':
        break
      case 'MODE': // :jtv MODE #<channel> +o||-o <user>
        this.mod(msg.params[0], msg.params[2], msg.params[1] === '+o')
        break
      case 'JOIN': // :<user>!<user>@<user>.tmi.twitch.tv JOIN #<channel>
        if (msg.user === this.opts.username) {
          this.clientData.channels[msg.params[0]] = {userstate: {}, phase: false}
          this.emit('join', msg.params[0])
        }
        this.userJoin(msg.params[0], msg.user as string)
        break
      case 'PART': // :<user>!<user>@<user>.tmi.twitch.tv PART #<channel>
        if (msg.user === this.opts.username) {
          this.emit('part', msg.params[0])
          delete this.clientData.channels[msg.params[0]]
        }
        this.userPart(msg.params[0], msg.user as string)
        break
      case 'CLEARCHAT':
        // @ban-duration=10;room-id=62300805;target-user-id=274274870;tmi-sent-ts=1551880699566 <prefix> CLEARCHAT #<channel> :<user>
        // @room-id=61365582;tmi-sent-ts=1553598835278 :tmi.twitch.tv CLEARCHAT #satsaa
        if (!msg.params[1]) this.ircLog(`Chat of ${msg.params[0]} cleared`)
        else {
          this.ircLog(`${msg.params[1]} ${typeof msg.tags['ban-duration'] === 'number'
          ? 'is timed out for ' + msg.tags['ban-duration'] + ' seconds'
          : 'is banned'}`)
        }
        if (!msg.params[1]) this.emit('clear', msg.params[0])
        else if (typeof msg.tags['ban-duration'] === 'number') this.emit('timeout', msg.params[0], msg.params[1], msg.tags['ban-duration'] as number)
        else this.emit('ban', msg.params[0], msg.params[1])
        break
      case 'ROOMSTATE': // <tags> :tmi.twitch.tv ROOMSTATE #<channel>
        if (msg.tags['emote-only'] === 1) { this.ircLog(`${msg.params[0]} is in emote only mode`)}
        if (msg.tags['followers-only'] !== -1) { this.ircLog(`${msg.params[0]} is in follower only mode (${msg.tags['followers-only']})`)}
        if (msg.tags['subs-only'] === 1) { this.ircLog(`${msg.params[0]} is in subscriber only mode`)}
        if (msg.tags.slow === 1) { this.ircLog(`${msg.params[0]} is in slow mode`)}
        this.emit('roomstate', msg.params[0], msg.tags)
        // broadcaster-lang=;emote-only=0;followers-only=-1;r9k=0;rituals=0;room-id=62300805;slow=0;subs-only=0
        break
      case 'USERSTATE': // <tags> <prefix> USERSTATE #<channel>
          // @badges=;color=#008000;display-name=NoModBot;emote-sets=0,326755;mod=0;subscriber=0;user-type=
        this.clientData.channels[msg.params[0]].userstate = {...this.clientData.channels[msg.params[0]].userstate, ...(msg ? msg.tags : {})}
        this.emit('userstate', msg.params[0],  msg.tags)
        break
      case 'GLOBALUSERSTATE': // <tags> <prefix> GLOBALUSERSTATE
        this.globaluserstate = {...this.globaluserstate, ...msg.tags}
        this.emit('globaluserstate', msg.params[0],  msg.tags)
        // badges=;color=#008000;display-name=NoModBot;emote-sets=0,326755;user-id=266132990;user-type= <prefix> GLOBALUSERSTATE
        break
      case 'HOSTTARGET':
        this.emit('hosttarget', msg.params[0], msg.params[1] === '- 0' ? msg.params[1] : null, msg.params[2] !== undefined ? ~~msg.params[2] : null)
        // HOSTTARGET #<channel> :<targetchannel> -
        // HOSTTARGET #<channel> :- 0
        // Host off has ":- 0"?
        break
      case 'PRIVMSG': // @userstate :<user>!<user>@<user>.tmi.twitch.tv PRIVMSG #<channel> :<message>
        const _msg = msg.params[1].endsWith(' \u206D') ? msg.params[1].substring(0, msg.params[1].length - 2) : msg.params[1]
        this.ircLog(`[${msg.params[0]}] ${msg.tags['display-name']}: ${_msg}`)
        if (_msg.startsWith('ACTION ')) {
          this.emit('chat', msg.params[0], msg.user as string, msg.tags, _msg.slice(8, -1), true, msg.user === this.opts.username)
        } else this.emit('chat', msg.params[0], msg.user as string, msg.tags, _msg, false, msg.user === this.opts.username)
        break
      case 'WHISPER': // @userstate :<user>!<user>@<user>.tmi.twitch.tv WHISPER <you> :<message>
        this.emit('whisper', msg.user as string, msg.params[1])
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
        this.emit('clearmsg', msg.params[0], msg.tags['target-msg-id'], msg.tags, msg.params[1])
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
        this.emit('usernotice', msg.params[0], msg.tags, msg.params[1])
        switch (msg.tags['msg-id']) {
          case 'resub':
          case 'sub':
            let user = msg.tags.login as string
            let streak = msg.tags['msg-param-months'] as number
            let cumulative = msg.tags['msg-param-cumulative-months'] as number | null
            let plan = msg.tags['msg-param-sub-plan-name'] as string | number
            this.emit('sub', msg.params[0], user, streak, cumulative, plan, false, msg.params[1])
            break
          case 'subgift':
          case 'anonsubgift':
            user = msg.tags['msg-param-recipient-user-name'] as string
            streak = msg.tags['msg-param-months'] as number
            cumulative = null
            plan = msg.tags['msg-param-sub-plan-name'] as string | number
            this.emit('sub', msg.params[0], user, streak, cumulative, plan, false, msg.params[1])
            break
          case 'submysterygift':
          case 'anonsubmysterygift':
            this.emit('massgift', msg.params[0], msg.tags.login as string, msg.tags['msg-param-mass-gift-count'] as number)
            break
          case 'charity':
            break
          case 'unraid':
            this.emit('raid', msg.params[0], null, null)
            break
          case 'raid':
            this.emit('raid', msg.params[0], msg.tags.login as string, msg.tags['viewer-count'] as number)
            break
          case 'ritual':
            this.emit('ritual', msg.params[0], msg.tags.login as string, msg.tags['msg-param-ritual-name'] as string, msg.params[1])
            break
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
        if (msg.tags['msg-id'] === 'msg_ratelimit') this.ircLog('Rate limited')
        this.emit('notice', msg.params[0], msg.tags, msg.params[1])
        switch (msg.tags['msg-id']) {
          case 'msg_ratelimit':
            this.ircLog('Rate limited')
            break
          case 'msg_timedout':
            const length = typeof msg.params[1] === 'string' ? ~~msg.params[1].match(/([0-9]*)[a-zA-Z .]*$/)![1] : 0
            this.emit('timeout', msg.params[0], this.opts.username, length)
          case 'msg_banned':
            this.emit('ban', msg.params[0], this.opts.username)
            break
          default:
            if (['subs_on' , 'subs_off', 'emote_only_on', 'emote_only_off', 'slow_on', 'slow_off', 'followers_on_zero', 'invalid_user ',
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
              'no_permission', 'whisper_limit_per_min', 'whisper_limit_per_sec', 'whisper_restricted_recipient', 'host_target_went_offline']
              .includes(msg.tags['msg-id'] as string)) this.ircLog(`${msg.params[0]}: ${msg.params[1]}`)
            else {
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
