import fs from 'fs'

import { PRIVMSG } from '../../main/client/parser'
import logger from '../../main/logger'
import * as afs from '../../main/lib/atomicFS'
import { PluginInstance, PluginOptions } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'controller',
  id: 'log',
  title: 'Log',
  description: 'Logs the chat',
  creates: [['log']],
}

interface LogData {
  /** Tracked offset for the next log event */
  offset: number
  /** Total log events */
  eventCount: number
  /** Total log users */
  userCount: number
  /** Time in **seconds** of the *first* log event */
  firstSec: number
  /** Time in **seconds** of the *last* log event */
  lastSec: number
  /** Event specifid info */
  events: {
    -readonly [P in Events]: {
      /** Total log events of this type */
      eventCount: number
      /** Time in **seconds** of the *first* log event of this event */
      firstSec: number
      /** Time in **seconds** of the *last* log event of this event */
      lastSec: number
    }
  }
  users: {
    [userId: number]: {
      /** Total log events for this user */
      eventCount: number
      /** Time in **seconds** of the *first* log event for this user */
      firstSec: number
      /** Time in **seconds** of the *last* log event for this user */
      lastSec: number
      /** Event specific data */
      events: {
        -readonly [P in Events]?: {
          /** Byte offset where the log event is in log.txt. Sum with all previous values */
          offsets: number[]
          /** The offset of the last event */
          offset: number
          /** When the event happenened in **seconds**. Sum with all previous values */
          times: number[]
          /** Time in **seconds** when the last event happened */
          time: number
        }
      }
    }
  }
}

export const events = {
  /** Generic chat message. Actions included, which use 'a' in log.txt! */
  chat: 'c',
  /** Used is timedout. Includes bans. */
  timeout: 't',
  /** Sub from any source */
  sub: 's',
  /** User gifts someone a sub */
  gift: 'g',
  /** User massgifts */
  massGift: 'm',
} as const

const _toLong: {[x: string]: string} = {}
for (const event in events) {
  const small = events[event as Events] // Why oh why
  _toLong[small] = event
}

const reverseEvents: {[P in typeof events[Events]]: Events} = _toLong as any

export type Events = keyof typeof events

type EventData = EventTypes[keyof EventTypes]

interface EventTypes {
  chat: ChatEvent
  timeout: TimeoutEvent
  sub: SubEvent
  gift: GiftEvent
  massGift: MassGiftEvent
}

interface ChatEvent {
  ms: number
  type: typeof events.chat
  action: boolean
  userId: number
  message: string
}
interface TimeoutEvent {
  ms: number
  type: typeof events.timeout
  userId: number
  data: {duration?: number, reason?: string}
}
interface SubEvent {
  ms: number
  type: typeof events.sub
  userId: number
  data: {streak?: number, cumulative?: number, tier: 1|2|3, prime: boolean, gifted: boolean, message?: string}
}
interface GiftEvent {
  ms: number
  type: typeof events.gift
  userId?: number
  data: {targetId: number, tier: 1 | 2 | 3, total?: number}
}
interface MassGiftEvent {
  ms: number
  type: typeof events.massGift
  userId?: number
  data: {count: number, tier: 1 | 2 | 3, total?: number}
}


export interface LogExtension {
  /**
   * Retrieves a log event from `userId` in `channelId`, if log data is loaded.
   * @param index Index of the event returned.
   */
  getEvent<T extends Events>(channelId: number, userId: number, event: T, index: number): Promise<EventTypes[T] | undefined>
  /**
   * Retrieves a log event from `userId` in `channelId`, if log data is loaded.
   * @param oneIndex Smart index of the returned event.
   * Uses one based indexes and constraints the index to valid indexes. Negative indexes return the -nth most last event.
   */
  getSmartEvent(channelId: number, userId: number, event: Events, oneIndex: number): Promise<EventData | undefined>
  /** Parses the log line at `offset` in `channelId`, if log data is loaded. */
  readOffset(channelId: number, offset: number): Promise<EventData | undefined>
  /** Returns the channel event data, if log data is loaded. */
  eventData(channelId: number, event: Events): undefined | LogData['events'][Events]
  /** Returns the total count of events logged in `channelId` optionally by `userId` and/or `event, if log data is loaded. */
  eventCount(channelId: number, userId: number, event?: Events): undefined | number
  eventCount(channelId: number, event: Events, userId?: number): undefined | number
  eventCount(channelId: number): undefined | number
  eventCount(channelId: number, arg1?: number | Events, arg2?: Events | number): undefined | number
  /** Returns the tracked userIds of `channelId`, if log data is loaded. */
  users(channelId: number): undefined | number[]
  /** Returns the tracking data of `userId` in `channelId`, if log data is loaded. */
  getUser(channelId: number, userId: number): LogData['users'][number] | undefined
  /** Returns the log data of `channelId` if its loaded. */
  getData(channelId: number): LogData | undefined
  /** Returns sorted event offsets of `events` from `userId` in `channelId`, if log data is loaded. `events` defaults to all events. */
  getInterlacedEventOffsets(channelId: number, userId: number, events?: Events[]): number[] | undefined
  /** Returns the offset for the event, if log data is loaded. */
  getOffset(channelId: number, userId: number, event: Events, index: number): number | undefined
  /** Returns the time in ms for the event, if log data is loaded. */
  getTime(channelId: number, userId: number, event: Events, index: number): number | undefined
}

export class Instance implements PluginInstance {
  public call: PluginInstance['call']
  private l: PluginLibrary
  private streams: { [channelId: number]: fs.WriteStream }
  /** File descriptors of each channel */
  private fds: { [channelId: number]: number }

  private chatListener?: Instance['onChat']
  private joinListener?: Instance['onJoin']
  private partListener?: Instance['onPart']
  private timeoutListener?: Instance['onTimeout']
  private subListener?: Instance['onSub']
  private giftListener?: Instance['onGift']
  private massGiftListener?: Instance['onMassGift']

  private defaultData: LogData

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.streams = {}
    this.fds = {}

    const data: any = { offset: 0, eventCount: 0, userCount: 0, firstSec: 0, lastSec: 0, events: {}, users: {} }
    for (const event in events) {
      const _event = event as Events
      data.events[_event] = { eventCount: 0, firstSec: 0, lastSec: 0 }
    }
    this.defaultData = data
  }
  // !!! Consider merging with constructor
  public async init() {
    this.l.autoLoad('log', this.defaultData, true)

    this.l.emitter.on('chat', this.chatListener = this.onChat.bind(this))
    this.l.emitter.on('join', this.joinListener = this.onJoin.bind(this))
    this.l.emitter.on('part', this.partListener = this.onPart.bind(this))
    this.l.emitter.on('timeout', this.timeoutListener = this.onTimeout.bind(this))
    this.l.emitter.on('sub', this.subListener = this.onSub.bind(this))
    this.l.emitter.on('gift', this.giftListener = this.onGift.bind(this))
    this.l.emitter.on('massgift', this.massGiftListener = this.onMassGift.bind(this))

    // Join existing channels
    for (const channelId of this.l.joinedChannels) {
      this.onJoin(channelId)
    }

    const extensions: LogExtension = {
      getEvent: this.getEvent.bind(this),
      getSmartEvent: this.getSmartEvent.bind(this),
      readOffset: this.readOffset.bind(this),
      getInterlacedEventOffsets: this.getInterlacedEventOffsets.bind(this),
      eventData: this.eventData.bind(this),
      eventCount: this.eventCount.bind(this),
      users: this.users.bind(this),
      getUser: this.getUser.bind(this),
      getData: this.getData.bind(this),
      getOffset: this.getOffset.bind(this),
      getTime: this.getTime.bind(this),
    }
    this.l.extend(options.id, extensions)

    this.l.u.onExit(this.onExit.bind(this))
  }

  public async unload() {
    if (this.chatListener) this.l.emitter.removeListener('chat', this.chatListener)
    if (this.joinListener) this.l.emitter.removeListener('join', this.joinListener)
    if (this.partListener) this.l.emitter.removeListener('part', this.partListener)
    if (this.timeoutListener) this.l.emitter.removeListener('timeout', this.timeoutListener)
    if (this.subListener) this.l.emitter.removeListener('sub', this.subListener)
    if (this.giftListener) this.l.emitter.removeListener('gift', this.giftListener)
    if (this.massGiftListener) this.l.emitter.removeListener('massgift', this.massGiftListener)

    this.chatListener = undefined
    this.joinListener = undefined
    this.partListener = undefined
    this.timeoutListener = undefined
    this.subListener = undefined
    this.giftListener = undefined
    this.massGiftListener = undefined

    this.l.unextend(options.id)

    this.onExit()
  }

  public eventData(channelId: number, event: Events) {
    const data = this.l.getData(channelId, 'log') as LogData
    if (!data) return
    return data.events[event]
  }

  public eventCount(channelId: number, userId: number, event?: Events): undefined | number
  public eventCount(channelId: number, event: Events, userId?: number): undefined | number
  public eventCount(channelId: number): undefined | number
  public eventCount(channelId: number, arg1?: number | Events, arg2?: Events | number): undefined | number {
    const data = this.l.getData(channelId, 'log') as LogData
    if (!data) return

    const userId: undefined | number = typeof arg1 === 'number' ? arg1 : typeof arg2 === 'number' ? arg2 : undefined
    const event: undefined | Events = typeof arg1 === 'string' ? arg1 : typeof arg2 === 'string' ? arg2 : undefined
    if (event && userId) return data.users[userId] && data.users[userId].events[event] ? data.users[userId].events[event]!.offsets.length : 0
    if (event) return data.events[event].eventCount
    if (userId) return (data.users[userId] || {}).eventCount || 0
    return data.eventCount
  }

  public users(channelId: number) {
    const data = this.l.getData(channelId, 'log') as LogData
    if (!data) return
    return Object.keys(data.users).map(v => Number(v))
  }

  public getUser(channelId: number, userId: number): LogData['users'][number] | undefined {
    const data = this.l.getData(channelId, 'log') as LogData
    if (!data) return
    return data.users[userId]
  }

  public getData(channelId: number) {
    return this.l.getData(channelId, 'log') as LogData | undefined
  }

  public async getSmartEvent(channelId: number, userId: number, event: Events, oneIndex: number): Promise<EventData | undefined> {
    const data = this.l.getData(channelId, 'log') as LogData
    if (!data || !data.users[userId] || !data.users[userId].events[event]) return

    const events = data.users[userId].events[event]!
    const index = this.l.u.smartIndex(oneIndex, events.offsets)
    if (index > events.offsets.length - 1) return

    const offset = events.offsets.slice(0, index + 1).reduce((prev, cur) => prev + cur)
    return this.readOffset(channelId, offset)
  }

  public async getEvent<T extends Events>(channelId: number, userId: number, event: T, index: number): Promise<EventTypes[T] | undefined> {
    const data = this.l.getData(channelId, 'log') as LogData
    if (!data || !data.users[userId] || !data.users[userId].events[event]) return

    const events = data.users[userId].events[event]!
    if (index > events.offsets.length - 1) return

    const offset = events.offsets.slice(0, index + 1).reduce((prev, cur) => prev + cur)
    const res = await this.readOffset(channelId, offset) as EventTypes[T] | undefined
    if (res && reverseEvents[res.type] !== event) return
    return res
  }

  public getInterlacedEventOffsets(channelId: number, userId: number, _events?: readonly Events[]): number[] | undefined {
    const user = this.getUser(channelId, userId)
    if (!user) return

    if (_events) _events = this.l.u.deduplicate(_events, true)
    else _events = Object.keys(events) as Events[]

    const offsets: {[P in Events]?: number[]} = { }
    for (const event of _events) {
      if (user.events[event]) offsets[event] = user.events[event]!.offsets
    }

    const normalized: {[P in Events]?: number[]} = {}
    for (const _event in offsets) {
      const event = _event as Events
      const current: number[] = []
      normalized[event] = current

      let added = 0
      for (const time of offsets[event]!) {
        added += time
        current.push(added)
      }
    }

    let merged: number[] = []
    for (const normal in normalized) {
      merged = [...merged, ...(normalized[normal as Events] as number[])]
    }
    return merged.sort((a, b) => a - b)
  }

  public readOffset(channelId: number, offset: number): Promise<EventData | undefined> {
    return new Promise((resolve) => {
      if (!this.fds[channelId]) return resolve()

      const stream = fs.createReadStream('', { start: offset, end: offset + 1028, encoding: 'utf8', fd: this.fds[channelId], autoClose: false })

      stream.once('data', (chunk: string) => {
        resolve(this.parseLogLine(chunk.split('\n')[0]))
      })
    })
  }

  public getOffset(channelId: number, userId: number, event: Events, index: number) {
    const data = this.l.getData(channelId, 'log') as LogData
    if (!data || !data.users[userId] || !data.users[userId].events[event]) return

    let total = 0
    let i = 0
    for (const offset of data.users[userId].events[event]!.offsets) {
      total += offset
      if (++i >= index) return total
    }
    return undefined
  }

  public getTime(channelId: number, userId: number, event: Events, index: number) {
    const data = this.l.getData(channelId, 'log') as LogData
    if (!data || !data.users[userId] || !data.users[userId].events[event]) return

    let total = 0
    let i = 0
    for (const time of data.users[userId].events[event]!.times) {
      total += time
      if (++i >= index) return total * 1000
    }
    return undefined
  }

  private async onChat(channelId: number, userId: number, tags: PRIVMSG['tags'], message: string, me: boolean) {
    if (!this.streams[channelId]) return console.error(`[${options.title}] {${channelId}} Message dropped: writeStream not ready`)
    if (!this.l.getData(channelId, 'log')) return console.error(`[${options.title}] {${channelId}} Message dropped: Data not ready`)
    this.track(channelId, Date.now(), me ? 'actionOverride' : reverseEvents[events.chat], userId, message)
  }

  private async onJoin(channelId: number) {
    if (!this.streams[channelId]) this.initStream(channelId)
  }

  private async onPart(channelId: number) {
    if (this.streams[channelId]) this.endStream(channelId)
  }

  private async onTimeout(channelId: number, userId: number, duration?: number) {
    if (!this.streams[channelId]) return console.error(`[${options.title}] {${channelId}} Timeout dropped: writeStream not ready`)
    if (!this.l.getData(channelId, 'log')) return console.error(`[${options.title}] {${channelId}} Timeout dropped: Data not ready`)

    const data: TimeoutEvent['data'] = { duration }
    this.track(channelId, Date.now(), 'timeout', userId, JSON.stringify(data, null, 0))
  }

  private async onSub(channelId: number, userId: number, streak: number | undefined, cumulative: number | undefined, tier: 1 | 2 | 3, prime: boolean, gifted: boolean, message: string | undefined) {
    if (!this.streams[channelId]) return console.error(`[${options.title}] {${channelId}} Sub dropped: writeStream not ready`)
    if (!this.l.getData(channelId, 'log')) return console.error(`[${options.title}] {${channelId}} Sub dropped: Data not ready`)

    const data: SubEvent['data'] = { streak, cumulative, tier, prime, gifted, message }
    this.track(channelId, Date.now(), 'sub', userId, JSON.stringify(data, null, 0))
  }

  private async onGift(channelId: number, gifterId: number | undefined, targetId: number, tier: 1 | 2 | 3, total?: number) {
    if (!this.streams[channelId]) return console.error(`[${options.title}] {${channelId}} Gift dropped: writeStream not ready`)
    if (!this.l.getData(channelId, 'log')) return console.error(`[${options.title}] {${channelId}} Gift dropped: Data not ready`)

    const data: GiftEvent['data'] = { targetId, tier, total }
    this.track(channelId, Date.now(), 'gift', gifterId || 0, JSON.stringify(data, null, 0))
  }

  private async onMassGift(channelId: number, gifterId: number | undefined, count: number, tier: 1 | 2 | 3, total?: number) {
    if (!this.streams[channelId]) return console.error(`[${options.title}] {${channelId}} MassGift dropped: writeStream not ready`)
    if (!this.l.getData(channelId, 'log')) return console.error(`[${options.title}] {${channelId}} MassGift dropped: Data not ready`)

    const data: MassGiftEvent['data'] = { count, tier, total }
    this.track(channelId, Date.now(), 'gift', gifterId || 0, JSON.stringify(data, null, 0))
  }

  private onExit(code?: number) {
    for (const id in this.streams) {
      this.streams[id].destroy()
    }
  }

  /** Initializes the write stream. Testing for errors and retracking if necessary */
  private async initStream(channelId: number) {
    const path = this.l.getPath(channelId, 'log', 'txt')
    await afs.mkdir(path.replace('log.txt', ''), { recursive: true })

    const stream = fs.createWriteStream(path, { flags: 'a+' })
    stream.once('open', (fd) => {
      this.streams[channelId] = stream
      this.fds[channelId] = fd
    })

    let fileSize = 0
    try {
      fileSize = (await afs.stat(path)).size
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
    }

    const data = await this.l.waitData(channelId, 'log', 2000) as LogData
    if (!data) throw new Error('Data was not loaded in time')
    if (fileSize !== data.offset) {
      if (!fileSize) {
        console.log(`${channelId} Reset log data because log txt size was falsy`)
        this.l.setData(channelId, 'log', this.defaultData)
      } else if (fileSize > data.offset) {
        await this.trackLog(channelId, data.offset)
      } else if (fileSize < data.offset) {
        this.l.setData(channelId, 'log', this.defaultData)
        await this.trackLog(channelId, 0) // Retrack completely if cached offset is ahead (e.g. deletion of log.txt)
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
    return new Promise((resolve) => {
      console.log(offset ? `[LOG] Tracking at offset ${offset} in ${channelId}` : `[LOG] Retracking ${this.l.api.cachedDisplay(channelId)} completely`)

      const start = Date.now()
      const path = this.l.getPath(channelId, 'log', 'txt')
      const stream = fs.createReadStream(path, { start: offset, highWaterMark: 4194304, encoding: 'utf8' })
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
        if (!data) throw new Error('Uh oh can\'t set size when data is unloaded')
        data.offset = (await afs.stat(path)).size
        console.log(`[LOG] Tracked ${this.l.u.plural(tracked, 'line')} ${failed ? `and skipped ${this.l.u.plural(failed, 'line ', 'lines ')}` : ''}in ${await this.l.api.getDisplay(channelId)} in ${Date.now() - start} ms`)
        resolve()
      })
    })
  }

  /** Adds a log line into log.json */
  private trackLine(channelId: number, line: string): boolean {
    const res = this.parseLogLine(line)
    if (!res) return false

    const colonSep = line.split(':')
    const trailerData = colonSep.slice(3).join(':')
    this.track(channelId, res.ms, reverseEvents[res.type], res.userId || 0, trailerData, true)
    return true
  }

  /** Writes a log event to log.txt and updates log data */
  private track(channelId: number, ms: number, _event: Events | 'actionOverride', userId: number, trailerData: string, noWrite = false) {
    const timeSec = Math.floor(ms / 1000)

    const event: Events = _event === 'actionOverride' ? 'chat' : _event

    const smallEvent = _event === 'actionOverride' ? 'a' : events[event]

    const final = `${timeSec}:${smallEvent}:${userId || ''}:${trailerData.replace(/\n/, ' ')}\n`
    if (!noWrite) this.streams[channelId].write(final)

    const data = this.l.getData(channelId, 'log') as LogData
    if (!data || !data.users) throw new Error('Data is unloaded or fully or partially') // Rare?
    if (!data.firstSec) data.firstSec = timeSec
    data.lastSec = timeSec
    data.eventCount++

    // Global event data
    const gEvent = data.events[event]
    gEvent.lastSec = timeSec
    if (!gEvent.firstSec) gEvent.firstSec = timeSec
    gEvent.eventCount++

    // User event data

    if (!data.users[userId]) {
      data.userCount++
      data.users[userId] = {
        eventCount: 0,
        firstSec: timeSec,
        lastSec: timeSec,
        events: {},
      }
    }

    const user = data.users[userId]

    user.eventCount++
    user.lastSec = timeSec

    // Debug 
    if (!user || !user.events) {
      logger.warn('EVENTS OR USER NOT DEFINED')
      logger.warn('user: ', user)
      logger.warn('event: ', event)
    }

    if (user.events[event]) {
      const eventPosData = user.events[event]!
      eventPosData.offsets.push(data.offset - eventPosData.offset)
      eventPosData.offset = data.offset
      eventPosData.times.push(timeSec - eventPosData.time)
      eventPosData.time = timeSec
    } else {
      user.events[event] = {
        offsets: [data.offset],
        offset: data.offset,
        times: [timeSec],
        time: timeSec,
      }
    }

    data.offset += Buffer.byteLength(final, 'utf8')
  }

  /** Parses a log event and returns the resulting `EventData` or undefined if the log message is deemed invalid */
  private parseLogLine(line: string): EventData | undefined {
    const nextNewLine = line.indexOf('\n')
    if (nextNewLine !== -1) line = line.slice(0, line.indexOf('\n'))

    const colonSep = line.split(':')

    const ms = Number(colonSep[0]) * 1000
    if (!ms) return

    const type = colonSep[1]
    if (!type) return

    const userId = Number(colonSep[2])
    if (!userId) return

    const data = colonSep.splice(3).join(':')

    switch (type) {
      case events.chat:
        // TIMESEC:c:USERID:MESSAGE
        return { ms, type, userId, action: false, message: data }
      case 'a':
        // TIMESEC:a:USERID:MESSAGE
        return { ms, type: events.chat, userId, action: true, message: data }
      case events.sub: {
        // TIMESEC:c|a:USERID:{streak?: number, cumulative?: number, tier: 1|2|3, prime?: true, gifted?: true, message?: string}
        try {
          const parsed = JSON.parse(data)
          if (typeof parsed !== 'object' || parsed === null || !parsed.tier) return void console.error(`Invalid JSON in sub event: ${data}`)
          return { ms, type, userId, data: parsed }
        } catch (err) {
          console.error(`Invalid JSON in sub event: ${line}:`, err)
          return
        }
      }
      case events.gift: {
        // TIMESEC:c|a:USERID?:{targetId: number, tier: 1 | 2 | 3, total?: number}
        try {
          const parsed = JSON.parse(data)
          if (typeof parsed !== 'object' || parsed === null || !parsed.targetId || !parsed.tier) {
            return void console.error(`Invalid JSON in gift event: ${data}`)
          }
          return { ms, type, userId: colonSep[2] ? userId : undefined, data: parsed }
        } catch (err) {
          console.error(`Invalid JSON in gift event: ${line}:`, err)
          return
        }
      }
      case events.massGift: {
        // TIMESEC:c|a:USERID?:{count: number, tier: 1 | 2 | 3, total?: number}
        try {
          const parsed = JSON.parse(data)
          if (typeof parsed !== 'object' || parsed === null || !parsed.count || !parsed.tier) {
            return void console.error(`Invalid JSON in massGift event: ${data}`)
          }
          return { ms, type, userId: colonSep[2] ? userId : undefined, data: parsed }
        } catch (err) {
          console.error(`Invalid JSON in massGift event: ${line}:`, err)
          return
        }
      }
      case events.timeout: {
        // TIMESEC:c|a:USERID:{duration?: number, reason?: string}
        try {
          const parsed = JSON.parse(data)
          if (typeof parsed !== 'object' || parsed === null) {
            return void console.error(`Invalid JSON in timeout event: ${data}`)
          }
          return { ms, type, userId, data: parsed }
        } catch (err) {
          console.error(`Invalid JSON in timeout event: ${line}:`, err)
          return
        }
      }
      default:
        return undefined
    }
  }
}
