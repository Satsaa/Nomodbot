import fs from 'fs'
import { promises as fsp } from 'fs'
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
  messageCount: number,
  userCount: number,
  firstSec: number,
  lastSec: number,
  users: {
    [userId: number]: {
      /** Byte offset where the log is in log.txt. The actual value is the sum of all previous values in the array */
      offsets: number[]
      offset: number
      /** When the logged action happenened in SECONDS. The actual value is the sum of all previous values in the array */
      times: number[]
      time: number
    }
  }
}

// Log msg type constants
const CHAT = 'c'
const ACTION = 'a'
const TIMEOUT = 't'
const BAN = 'b'
const SUB = 's'
const GIFT = 'g'
const MASSGIFT = 'mg'
type TYPES = typeof CHAT |  typeof ACTION | typeof TIMEOUT | typeof BAN | typeof SUB | typeof GIFT | typeof MASSGIFT

export interface LogExtension {
  getAction(channelId: number, userId: number, messageIndex: number): Promise<LogLineData | undefined>
}
export class Instance implements PluginInstance {

  private l: PluginLibrary
  private streams: { [channelId: number]: fs.WriteStream }
  private defaultData: LogData

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.streams = {}
    this.defaultData = { offset: 0, messageCount: 0, userCount: 0, firstSec: 0, lastSec: 0, users: {} }
  }

  public async init() {
    this.l.autoLoad('log', this.defaultData, true)
    this.l.emitter.on('chat', this.onChat.bind(this))
    this.l.emitter.on('join', this.onJoin.bind(this))
    this.l.emitter.on('part', this.onPart.bind(this))

    const extensions: LogExtension = {
      getAction: this.getAction.bind(this),
    }
    this.l.extend(options.id, extensions)

    this.l.u.onExit(this.onExit.bind(this))
  }

  public getAction(channelId: number, userId: number, index: number): Promise<LogLineData | undefined> {
    return new Promise((resolve) => {
      const data = this.l.getData(channelId, 'log') as LogData
      if (!data) return resolve()
      if (!data.users[userId]) return resolve()
      const user = data.users[userId]
      if (index + 1 > user.offsets.length) return resolve()
      const offset = user.offsets.slice(0, index + 1).reduce((prev, cur) => prev + cur)
      const path = this.l.getPath(channelId, 'log', 'txt')
      const stream = fs.createReadStream(path, {start: offset, highWaterMark: 1, encoding: 'utf8'})

      let line = ''
      stream.on('data', (char) => {
        stream.pause()
        if (char === '\n') {
          stream.close()
        } else {
          line += char
        }
        stream.resume()
      })
      stream.on('close', async () => {
        stream.destroy()
        resolve(this.parseLogLine(line))
      })
    })

  }

  private async onChat(channelId: number, userId: number, userstate: Required<IrcMessage['tags']>, message: string, me: boolean) {
    if (!this.streams[channelId]) return console.warn(`[${options.name}] {${channelId}} Message dropped: writeStream not ready`)
    if (!this.l.getData(channelId, 'log')) return console.warn(`[${options.name}] {${channelId}} Message dropped: writeStream not ready`)
    this.track(channelId, Date.now(), me ? ACTION : CHAT, userId, message)
  }

  private async onJoin(channelId: number) {
    if (!this.streams[channelId]) this.initStream(channelId)

  }

  private async onPart(channelId: number) {
    if (this.streams[channelId]) this.endStream(channelId)
  }

  private onExit(code: number) {
    for (const id in this.streams) {
      this.streams[id].end()
    }
  }

  /** Initializes the write stream. Testing for errors and retracking if necessary */
  private async initStream(channelId: number) {
    const path = this.l.getPath(channelId, 'log', 'txt')
    const stream = fs.createWriteStream(path, { flags: 'a' })
    stream.once('open', (fd) => {
      this.streams[channelId] = stream
    })

    let fileSize = 0
    try {
      fileSize = (await fsp.stat(path)).size
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
    }
    const data = await this.l.waitData(channelId, 'log', 2000) as LogData
    if (!data) throw new Error('Data was not loaded in time')
    if (fileSize !== data.offset + 2) {
      if (!fileSize) {
        console.log('Reset data because filesize was falsy')
        this.l.setData(channelId, 'log', this.defaultData)
      } else {
        if (fileSize > data.offset + 2) {
          await this.trackLog(channelId, data.offset)
        } else if (fileSize < data.offset + 2) {
          this.l.setData(channelId, 'log', this.defaultData)
          await this.trackLog(channelId, 0) // Retrack completely if cached offset is ahead (e.g. deletion of log.txt)
        }
      }
    }
  }

  private endStream(channelId: number) {
    const stream = this.streams[channelId]
    delete this.streams[channelId]
    stream.end()
  }

  private trackLog(channelId: number, offset = 0) {
    return new Promise((resolve) => {
      console.log(offset ? `[LOG] Tracking at offset ${offset} in ${channelId}` : `[LOG] Retracking ${channelId} completely`)
      const path = this.l.getPath(channelId, 'log', 'txt')
      const stream = fs.createReadStream(path, {start: offset, highWaterMark: 1, encoding: 'utf8'})
      let line = ''
      let tracked = 0
      stream.on('data', (char) => {
        stream.pause()
        if (char === '\n') {
          this.trackLine(channelId, line)
          tracked++
          line = ''
        } else {
          line += char
        }
        stream.resume()
      })
      stream.on('close', async () => {
        stream.destroy()
        const data = this.l.getData(channelId, 'log')
        if (!data) throw new Error("Uh oh can't set size when data is unloaded")
        data.offset = (await fsp.stat(path)).size
        console.log(`[LOG] Tracked ${this.l.u.plural(tracked, 'line')} in ${await this.l.api.getDisplay(channelId)}`)
        resolve()
      })
    })
  }

  /** Tracks a log line in log data */
  private trackLine(channelId: number, line: string): boolean {
    const res = this.parseLogLine(line)
    if (!res || !(res.type === CHAT || res.type === ACTION)) {
      console.log(`Invalid ${res ? 'log line type' : 'log line'}: "${line}"`)
      return false
    }
    this.track(channelId, res.time, res.type, res.userId, res.message, true)
    return true
  }

  /** Writes the log message to log.txt and updates log data */
  private track(channelId: number, time: number, type: TYPES, userId: number, message: string, noWrite = false) {
    time = Math.round(time / 1000)
    const final = `${time}:${type}:${userId}:${message.replace(/\n/g, '')}\n`
    if (!noWrite) this.streams[channelId].write(final)
    const data = this.l.getData(channelId, 'log') as LogData
    if (!data) throw new Error('Data was unloaded before writing finished') // Rare?
    if (!data.firstSec) data.firstSec = time
    data.lastSec = time
    data.messageCount ++
    if (!data.users[userId]) {
      data.userCount ++
      data.users[userId] = {
        offsets: [data.offset],
        offset: data.offset,
        times: [time],
        time,
      }
    } else {
      const user = data.users[userId]
      user.offsets.push(data.offset - user.offset)
      user.offset = data.offset
      user.times.push(time - user.time)
      user.time = time
    }
    data.offset += Buffer.byteLength(final, 'utf8')
  }

  /** Parses a log message and returns the resulting `LogMessage` or undefined if the log message is deemed invalid */
  private parseLogLine(line: string): LogLineData | undefined {
    const nextNewLine = line.indexOf('\n')
    if (nextNewLine !== -1) line = line.slice(0, line.indexOf('\n'))
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
        // TIMESEC:t:USERID:DURATION:SOURCEID?:REASON
        duration = +colon[3]
        if (!duration) return
        sourceId = colon[4] ? +colon[4] : undefined
        if (!sourceId) sourceId = undefined // NaN to undefined
        message = colon.splice(5).join(':')
        return { time, type, userId, duration, sourceId, message }
      case BAN:
        // TIMESEC:b:USERID:SOURCEID?:REASON
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

type LogLineData = {
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
