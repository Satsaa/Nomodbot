import fs from 'fs'
import { promises as fsp } from 'fs'
import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'controller',
  id: 'log',
  title: 'Log',
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
      /** The offset of the last logged action */
      offset: number
      /** When the logged action happenened in SECONDS. The actual value is the sum of all previous values in the array */
      times: number[]
      /** Time in SECONDS when the last logged action happened */
      time: number
    }
  }
}

// Log msg type constants
export const CHAT = 'c'
export const ACTION = 'a'
export const TIMEOUT = 't'
export const BAN = 'b'
export const SUB = 's'
export const GIFT = 'g'
export const MASSGIFT = 'mg'
export type TYPES = typeof CHAT | typeof ACTION | typeof TIMEOUT | typeof BAN | typeof SUB | typeof GIFT | typeof MASSGIFT

export interface LogExtension {
  /**
   * Retrieves a chat message from `userId` in `channelId` if log data is loaded
   * @param messageIndex Index of message returned
   */
  getMsg(channelId: number, userId: number, messageIndex: number): Promise<LogLineData | undefined>
  /**
   * Retrieves a chat message from `userId` in `channelId` if log data is loaded
   * @param oneBasedMessageIndex Smart index of the returend message
   * Smart index uses one based indexes and constraints the index to valid message indexes. Negative indexes return the -nth last message
   */
  getSmartIndexMsg(channelId: number, userId: number, oneBasedMessageIndex: number): Promise<LogLineData | undefined>
  /** Parses the log line at `offset` in `channelId` if log data is loaded */
  readOffset(channelId: number, offset: number): Promise<LogLineData | undefined>
  /** Returns the total count of messages sent in `channelId` optionally by `userId` if log data is loaded */
  msgCount(channelId: number, userId?: number): number | undefined
  /** Returns the tracked userIds of `channelId` if log data is loaded */
  users(channelId: number): undefined | number[]
  /** Returns the tracking data of `userId` in `channelId` if log data is loaded */
  getUser(channelId: number, userId: number): LogData['users'][number] | undefined
  /** Returns the log data of `channelId` if its loaded */
  getData(channelId: number): LogData | undefined
  /** Validates the tracked data for `userId` in `channelId` if log data is loaded  Returns true if no problems were found, a string on problem found */
  validate(channelId: number, userId: number): Promise<true | string | undefined>
  /** Returns the offset for the message if log data is loaded */
  getOffset(channelId: number, userId: number, messageIndex: number): number | undefined
  /** Returns the time in ms for the message if log data is loaded */
  getTime(channelId: number, userId: number, messageIndex: number): number | undefined
}
export class Instance implements PluginInstance {

  private l: PluginLibrary
  private streams: { [channelId: number]: fs.WriteStream }
  /** File descriptors of each channel */
  private fds: { [channelId: number]: number }

  private chatListener: any
  private joinListener: any
  private partListener: any

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.streams = {}
    this.fds = {}
  }

  private get defaultData(): LogData {
    return { offset: 0, messageCount: 0, userCount: 0, firstSec: 0, lastSec: 0, users: {} }
  }

  public async init() {
    this.l.autoLoad('log', this.defaultData, true)

    this.l.emitter.on('chat', this.chatListener = this.onChat.bind(this))
    this.l.emitter.on('join', this.joinListener = this.onJoin.bind(this))
    this.l.emitter.on('part', this.partListener = this.onPart.bind(this))
    // Join existing channels
    for (const channelId of this.l.joinedChannels) {
      this.onJoin(channelId)
    }

    const extensions: LogExtension = {
      getMsg: this.getMsg.bind(this),
      getSmartIndexMsg: this.getSmartIndexMsg.bind(this),
      readOffset: this.readOffset.bind(this),
      msgCount: this.msgCount.bind(this),
      users: this.users.bind(this),
      getUser: this.getUser.bind(this),
      getData: this.getData.bind(this),
      validate: this.validate.bind(this),
      getOffset: this.getOffset.bind(this),
      getTime: this.getTime.bind(this),
    }
    this.l.extend(options.id, extensions)

    this.l.u.onExit(this.onExit.bind(this))
  }

  public async unload() {
    this.l.emitter.removeListener('chat', this.chatListener)
    this.l.emitter.removeListener('join', this.joinListener)
    this.l.emitter.removeListener('part', this.partListener)

    this.l.unextend(options.id)

    this.onExit()
    return
  }

  public async validate(channelId: number, userId: number) {
    const data = this.l.getData(channelId, 'log') as LogData
    if (!data || !data.users[userId]) return
    const user = data.users[userId]
    if (user.offsets.length !== user.times.length) return 'offsets times length mismatch'

    if (!user.offsets.every(v => typeof v === 'number')) return 'Not all offsets are numbers'
    if (!user.times.every(v => typeof v === 'number')) return 'Not all times are numbers'

    if (user.offset !== user.offsets.reduce((prev, cur) => prev + cur)) return 'offset does not match offsets sum'
    if (user.time !== user.times.reduce((prev, cur) => prev + cur)) return 'time does not match times sum'

    let start = Date.now()
    for (let i = 0; i < user.offsets.length; i++) {
      if (i % 10000 === 0) {
        const end = Date.now()
        console.log(`${Math.round((end - start) / 1000)} ms`)
        start = Date.now()
      }
      const res = await this.getMsg(channelId, userId, i)
      if (!res) {
        return `Invalid message at index ${i}`
      }
      if (!(res.type === CHAT || res.type === ACTION)) {
        return `Not a logged type ${res.type}`
      }
      if (Math.round(res.ms / 1000) !== user.times.slice(0, i + 1).reduce((prev, cur) => prev + cur)) {
        return `Tracked message time does not match log.txt message time: ${i}`
      }
      if (res.userId !== userId) {
        return `UserIds don't match ${res.userId} !== ${userId}: ${i}`
      }
    }

    return true
  }

  public msgCount(channelId: number, userId?: number) {
    const data = this.l.getData(channelId, 'log') as LogData
    if (!data) return
    if (userId) return data.users[userId] ? data.users[userId].offsets.length : 0
    return data.messageCount
  }

  public users(channelId: number) {
    const data = this.l.getData(channelId, 'log') as LogData
    if (!data) return
    return Object.keys(data.users).map(v => +v)
  }

  public getUser(channelId: number, userId: number) {
    const data = this.l.getData(channelId, 'log') as LogData
    if (!data) return
    return data.users[userId]
  }

  public getData(channelId: number) {
    return this.l.getData(channelId, 'log') as LogData | undefined
  }

  public getSmartIndexMsg(channelId: number, userId: number, oneIndex: number): Promise<LogLineData | undefined> {
    return new Promise((resolve) => {
      const data = this.l.getData(channelId, 'log') as LogData
      if (!data) return resolve()
      if (!data.users[userId]) return resolve()
      const user = data.users[userId]
      const index = this.l.u.smartIndex(oneIndex, user.offsets)
      if (index > user.offsets.length - 1) return resolve()
      const offset = user.offsets.slice(0, index + 1).reduce((prev, cur) => prev + cur)
      this.readOffset(channelId, offset).then(resolve)
    })
  }

  public getMsg(channelId: number, userId: number, index: number): Promise<LogLineData | undefined> {
    return new Promise((resolve) => {
      const data = this.l.getData(channelId, 'log') as LogData
      if (!data) return resolve()
      if (!data.users[userId]) return resolve()
      const user = data.users[userId]
      if (index > user.offsets.length - 1) return resolve()
      const offset = user.offsets.slice(0, index + 1).reduce((prev, cur) => prev + cur)
      this.readOffset(channelId, offset).then(resolve)
    })
  }

  public async readOffset(channelId: number, offset: number): Promise<LogLineData | undefined> {
    return new Promise((resolve) => {
      if (!this.fds[channelId]) return resolve()
      let stream: undefined | fs.ReadStream = fs.createReadStream('', {start: offset, highWaterMark: 64, encoding: 'utf8', fd: this.fds[channelId], autoClose: false})

      let line = ''
      stream.on('data', (chunk: string) => {
        const split = chunk.split('\n')
        line += split[0]
        if (split.length === 1) return
        stream!.pause()
        stream = undefined
        resolve(this.parseLogLine(line))
      })
    })
  }

  public getOffset(channelId: number, userId: number, index: number) {
    const data = this.l.getData(channelId, 'log') as LogData
    if (!data || !data.users[userId]) return
    let total = 0
    let i = 0
    for (const offset of data.users[userId].offsets) {
      total += offset
      if (++i >= index) return total
    }
    return undefined
  }

  public getTime(channelId: number, userId: number, index: number) {
    const data = this.l.getData(channelId, 'log') as LogData
    if (!data || !data.users[userId]) return
    let total = 0
    let i = 0
    for (const time of data.users[userId].times) {
      total += time
      if (++i >= index) return total * 1000
    }
    return undefined
  }

  private async onChat(channelId: number, userId: number, tags: PRIVMSG['tags'], message: string, me: boolean) {
    if (!this.streams[channelId]) return console.warn(`[${options.title}] {${channelId}} Message dropped: writeStream not ready`)
    if (!this.l.getData(channelId, 'log')) return console.warn(`[${options.title}] {${channelId}} Message dropped: writeStream not ready`)
    this.track(channelId, Date.now(), me ? ACTION : CHAT, userId, message)
  }

  private async onJoin(channelId: number) {
    if (!this.streams[channelId]) this.initStream(channelId)
  }

  private async onPart(channelId: number) {
    if (this.streams[channelId]) this.endStream(channelId)
  }

  private onExit(code?: number) {
    for (const id in this.streams) {
      this.streams[id].destroy()
    }
  }

  /** Initializes the write stream. Testing for errors and retracking if necessary */
  private async initStream(channelId: number) {
    const path = this.l.getPath(channelId, 'log', 'txt')
    await fsp.mkdir(path.replace('log.txt', ''), {recursive: true})
    const stream = fs.createWriteStream(path, { flags: 'a+'})
    stream.once('open', (fd) => {
      this.streams[channelId] = stream
      this.fds[channelId] = fd
    })

    let fileSize = 0
    try {
      fileSize = (await fsp.stat(path)).size
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
    }
    const data = await this.l.waitData(channelId, 'log', 2000) as LogData
    if (!data) throw new Error('Data was not loaded in time')
    if (fileSize !== data.offset) {
      if (!fileSize) {
        console.log(`${channelId} Reset log data because log txt size was falsy`)
        this.l.setData(channelId, 'log', this.defaultData)
      } else {
        if (fileSize > data.offset) {
          await this.trackLog(channelId, data.offset)
        } else if (fileSize < data.offset) {
          this.l.setData(channelId, 'log', this.defaultData)
          await this.trackLog(channelId, 0) // Retrack completely if cached offset is ahead (e.g. deletion of log.txt)
        }
      }
    }
  }

  private endStream(channelId: number) {
    const stream = this.streams[channelId]
    delete this.streams[channelId]
    delete this.fds[channelId]
    stream.end()
  }

  private trackLog(channelId: number, offset = 0) {
    return new Promise(async (resolve) => {
      console.log(offset ? `[LOG] Tracking at offset ${offset} in ${channelId}` : `[LOG] Retracking ${await this.l.api.getDisplay(channelId)} completely`)
      const start = Date.now()
      const path = this.l.getPath(channelId, 'log', 'txt')
      const stream = fs.createReadStream(path, {start: offset, highWaterMark: 1000000, encoding: 'utf8'})
      let splitEnd = ''
      let tracked = 0
      let failed = 0
      stream.on('data', (chunk: string) => {
        stream.pause()
        const chunks = chunk.split('\n')
        chunks[0] = splitEnd + chunks[0] // Combine previous chunks partial last line and partial first line of this chunk
        splitEnd = chunks.pop() as string
        for (const line of chunks) {
          if (this.trackLine(channelId, line)) tracked++
          else failed++
        }
        stream.resume()
      })
      stream.on('close', async () => {
        stream.destroy()
        const data = this.l.getData(channelId, 'log')
        if (!data) throw new Error("Uh oh can't set size when data is unloaded")
        data.offset = (await fsp.stat(path)).size
        console.log(`[LOG] Tracked ${this.l.u.plural(tracked, 'line')} ${failed ? this.l.u.plural(tracked, 'line ' , 'lines ') : ''}in ${await this.l.api.getDisplay(channelId)} in ${Date.now() - start} ms`)
        resolve()
      })
    })
  }

  /** Adds a log line into log.json */
  private trackLine(channelId: number, line: string): boolean {
    const res = this.parseLogLine(line)
    if (!res) {
      return false
    }
    if (res.type !== CHAT && res.type !== ACTION) return true
    this.track(channelId, res.ms, res.type, res.userId, res.message, true)
    return true
  }

  /** Writes the log message to log.txt and updates log data */
  private track(channelId: number, time: number, type: TYPES, userId: number, message: string, noWrite = false) {
    time = Math.round(time / 1000)
    const final = `${time}:${type}:${userId}:${message.replace(/\n/g, '')}\n`
    if (!noWrite) this.streams[channelId].write(final)
    const data = this.l.getData(channelId, 'log') as LogData
    if (!(data || {}).users) throw new Error('Data is unloaded or fully or partially') // Rare?
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

    const ms = +colon[0] * 1000
    if (!ms) return
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
        return { ms, type, userId, message }
      case TIMEOUT:
        // TIMESEC:t:USERID:DURATION:SOURCEID?:REASON
        duration = +colon[3]
        if (!duration) return
        sourceId = colon[4] ? +colon[4] : undefined
        if (!sourceId) sourceId = undefined // NaN to undefined
        message = colon.splice(5).join(':')
        return { ms, type, userId, duration, sourceId, message }
      case BAN:
        // TIMESEC:b:USERID:SOURCEID?:REASON
        sourceId = colon[3] ? +colon[3] : undefined
        if (!sourceId) sourceId = undefined // NaN to undefined
        message = colon.splice(4).join(':')
        return { ms, type, userId, sourceId, message }
      case SUB:
        // TIMESEC:s:USERID:STREAK:TIER:MESSAGE
        const streak = +colon[3]
        if (!streak) return // Minimum streak would be 1 so 0 should not pass
        tier = Math.floor(+colon[4])
        if (isNaN(tier) || tier < 1 || tier > 3) return
        message = colon.splice(6).join(':')
        return { ms, type, userId, streak, tier: tier as 1 | 2 | 3, message }
      case GIFT:
        // TIMESEC:g:USERID:TARGETID:TIER
        const targetId = +colon[3]
        if (!targetId) return
        tier = Math.floor(+colon[4])
        if (isNaN(tier) || tier < 1 || tier > 3) return
        return { ms, type, userId, targetId, tier: tier as 1 | 2 | 3 }
      case MASSGIFT:
          // TIMESEC:mg:USERID:COUNT:TIER
        const count = +colon[3]
        if (!count) return
        tier = Math.floor(+colon[4])
        if (isNaN(tier) || tier < 1 || tier > 3) return
        return { ms, type, userId, count, tier: tier as 1 | 2 | 3 }
      default:
        return
    }
  }
}

type LogLineData = {
  ms: number
  type: typeof CHAT | typeof ACTION
  userId: number
  message: string
} | {
  ms: number
  type: typeof TIMEOUT
  userId: number
  duration: number
  sourceId?: number
  message: string
} | {
  ms: number
  type: typeof BAN
  userId: number
  sourceId?: number
  message: string
} | {
  ms: number
  type: typeof SUB
  userId: number
  streak: number,
  tier: 1 | 2 | 3
  message: string
} | {
  ms: number
  type: typeof GIFT
  userId: number
  targetId: number
  tier: 1 | 2 | 3
} | {
  ms: number
  type: typeof MASSGIFT
  userId: number
  count: number
  tier: 1 | 2 | 3
}
