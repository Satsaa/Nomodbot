import fs from 'fs'
import { IrcMessage } from '../../src/client/parser'
import { PluginInstance, PluginOptions } from '../../src/Commander'
import PluginLibrary from '../../src/pluginLib'

export const options: PluginOptions = {
  type: 'controller',
  id: 'log',
  name: 'Log',
  description: 'Logs the chat',
  creates: [['log']],
}

interface LogData {
  offset: number,
  messages: number,
  users: number,
  firstMs: number,
  lastMs: number,
}

// Log msg type constants
const CHAT = 'c'
const ACTION = 'a'
const TIMEOUT = 't'
const BAN = 'b'
const SUB = 's'
const GIFT = 'g'
const MASSGIFT = 'mg'

export class Instance implements PluginInstance {

  private l: PluginLibrary
  private streams: { [channelId: number]: fs.WriteStream }

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.streams = {}
  }

  public async init() {
    this.l.autoLoad('log', { offset: 0, messages: 0, users: 0, firstMs: 0, lastMs: 0 } as LogData)
    this.l.emitter.on('chat', this.onChat.bind(this))
    this.l.emitter.on('join', this.onJoin.bind(this))
    this.l.emitter.on('part', this.onPart.bind(this))
    this.l.u.onExit(this.onExit.bind(this))
  }

  private async onChat(channelId: number, userId: number, userstate: Required<IrcMessage['tags']>, message: string, me: boolean) {
    if (!this.streams[channelId]) {
      console.warn(`[${options.name}] {${channelId}} Message dropped: writeStream not ready`)
      return
    }
    this.write(channelId, me ? ACTION : CHAT, userId, message)
  }

  private async onJoin(channelId: number) {
    if (!this.streams[channelId]) this.startStream(channelId)

  }

  private async onPart(channelId: number) {
    if (this.streams[channelId]) this.endStream(channelId)
  }

  private onExit(code: number) {
    for (const id in this.streams) {
      this.streams[id].end()
    }
  }

  private write(channelId: number, type: string, userId: number, message: string, ms = Date.now()) {
    this.streams[channelId].write(`${Math.round(ms / 1000)}:${type}:${userId}:${message.replace(/\n/g, '')}\n`)
  }

  private startStream(channelId: number) {
    const path = this.l.getPath(channelId, 'log', 'txt')
    const stream = fs.createWriteStream(path, { flags: 'a' })
    stream.once('open', (fd) => {
      this.streams[channelId] = stream
    })
  }

  private endStream(channelId: number) {
    const stream = this.streams[channelId]
    delete this.streams[channelId]
    stream.end()
  }

  /** Parses a log message and returns the resulting `LogMessage` or undefined if the log message is deemed invalid */
  private parseLogLine(line: string): LogMessage | undefined {
    if (line.endsWith('\n')) return
    const colon = line.split(':')

    const time = +colon[0] * 1000
    if (!time) return
    const type = colon[1]
    if (!type) return
    const userId = +colon[2]
    if (!userId) return

    let duration
    let sourceId
    let message
    let tier
    switch (type) {
      case CHAT:
      case ACTION:
        // TIMESEC:c|a:USERID:MESSAGE
        message = colon.splice(3).join(':')
        return { time, type, userId, message }
      case TIMEOUT:
        // TIMESEC:t:USERID:DURATION:SOURCEID?:REASON?
        duration = +colon[3]
        if (!duration) return
        sourceId = colon[4] ? +colon[4] : undefined
        if (!sourceId) sourceId = undefined // NaN to undefined
        message = colon.splice(5).join(':')
        return { time, type, userId, duration, sourceId, message }
      case BAN:
        // TIMESEC:b:USERID:SOURCEID:REASON
        sourceId = colon[3] ? +colon[3] : undefined
        if (!sourceId) sourceId = undefined // NaN to undefined
        message = colon.splice(4).join(':')
        return { time, type, userId, sourceId, message }
      case SUB:
        // TIMESEC:s:USERID:STREAK:TIER:MESSAGE
        const streak = +colon[3]
        if (!streak) return // Minimum streak would be 1 so 0 should not pass
        tier = Math.floor(+colon[4])
        if (isNaN(tier) || tier < 1 || tier > 3) return
        message = colon.splice(6).join(':')
        return { time, type, userId, streak, tier: tier as 1 | 2 | 3, message }
      case GIFT:
        // TIMESEC:g:USERID:TARGETID:TIER
        const targetId = +colon[3]
        if (!targetId) return
        tier = Math.floor(+colon[4])
        if (isNaN(tier) || tier < 1 || tier > 3) return
        return { time, type, userId, targetId, tier: tier as 1 | 2 | 3 }
      case MASSGIFT:
          // TIMESEC:mg:USERID:COUNT:TIER
        const count = +colon[3]
        if (!count) return
        tier = Math.floor(+colon[4])
        if (isNaN(tier) || tier < 1 || tier > 3) return
        return { time, type, userId, count, tier: tier as 1 | 2 | 3 }
      default:
        return
    }
  }
}

type LogMessage = {
  time: number
  type: typeof CHAT | typeof ACTION
  userId: number
  message: string
} | {
  time: number
  type: typeof TIMEOUT
  userId: number
  duration: number
  sourceId?: number
  message: string
} | {
  time: number
  type: typeof BAN
  userId: number
  sourceId?: number
  message: string
} | {
  time: number
  type: typeof SUB
  userId: number
  streak: number,
  tier: 1 | 2 | 3
  message: string
} | {
  time: number
  type: typeof GIFT
  userId: number
  targetId: number
  tier: 1 | 2 | 3
} | {
  time: number
  type: typeof MASSGIFT
  userId: number
  count: number
  tier: 1 | 2 | 3
}
