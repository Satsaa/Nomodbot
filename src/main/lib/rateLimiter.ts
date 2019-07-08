import deepClone from './deepClone'

export interface RateLimiterOptions {
  /** Max age of an entry */
  duration?: number
  /** Max entries within `options.duration` */
  limit?: number
  /** Min time between entries */
  delay?: number
  /** Maximum queued entries at a time */
  queueSize?: null | number
}

/**
 * Enables creating queues for actions and keeping rates within provided limits  
 */
export default class RateLimiter {
  public queueSize: null | number
  public times: number[][]
  public entries: Array<{cb: (...args: any[]) => void, args: any[], resolve: (value: boolean) => void }>
  private opts: Array<Required<RateLimiterOptions>>

  /**
     * Enables queueing actions within limits
     * @param options Array or single instance of options.  
     * The delay is calculated for each and the highest delay is selected.  
     * Lowest defined queueSize is selected.  
     * @param queueSize Maximum queued entries at once
     */
  constructor(options: DeepReadonly<RateLimiterOptions | RateLimiterOptions[]>) {
    options = deepClone(options)

    const opts = Array.isArray(options) ? options : [options]
    this.opts = []
    this.times = []
    opts.forEach((element) => {
      this.times.push([])
      this.opts.push({
        duration: 60000,
        limit: 1,
        delay: 0,
        queueSize: null,
        ...element,
      })
    })
    this.queueSize = Math.max(...this.opts.filter(value => value.queueSize !== null).map(value => value.queueSize!))
    if (this.queueSize === -Infinity) this.queueSize = null // Math.max() with no args returns -infinity
    this.entries = []
  }

  /**
     * Queue calling of `cb` with optional `args`  
     * This entry will be placed last on the queue  
     * @param cb Callback function 
     * @param args Function arguments for `cb`
     */
  public queue(cb: (...args: any[]) => void, ...args: any[]): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.queueSize !== null && this.entries.length + 1 > this.queueSize) {
        return
      }
      if (this.entries.push({ cb, args, resolve }) === 1) {
        this.refreshLoop()
      }
    })
  }

  /**
     * Queue calling of `cb` with optional `args`  
     * This entry will be placed FIRST on the queue
     * @param cb Callback function
     * @param args Function arguments for `cb`
     */
  public queueNext(cb: (...args: any[]) => void, ...args: any[]): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.queueSize !== null && this.entries.length + 1 > this.queueSize) {
        const entry = this.entries.pop()
        if (entry) entry.resolve(false)
      }
      if (this.entries.unshift({ cb, args, resolve }) === 1) {
        this.refreshLoop()
      }
    })
  }

  private loop() {
    const now = Date.now()
    const entry = this.entries[0]
    this.times.forEach((times) => { times.push(now) })
    entry.cb(...entry.args)
    entry.resolve(true)
    this.entries.shift()
    if (this.entries.length > 0) {
      setTimeout(() => {
        this.loop()
      }, this.getTimeout())
    }
  }

  // Starts the loop if it is dormant
  private refreshLoop() {
    if (this.entries.length === 1) {
      setTimeout(() => {
        this.loop()
      }, this.getTimeout())
    }
  }

  private getTimeout() {
    return Math.max(...this.opts.map((options, i) => this._getTimeout(options, i)))
  }

  private _getTimeout(options: Required<RateLimiterOptions>, timesIndex: number) {
    const now = Date.now()
    const times = this.times[timesIndex]

    // Remove old entries
    for (let i = 0; i < times.length; i++) {
      if (times[i] < now - options.duration) {
        times.shift()
        i--
      } else {
        break
      }
    }

    let lastMsgTime = times[times.length - 1]
    if (isNaN(lastMsgTime)) lastMsgTime = 0

    // if there is more or equal items in array than limit (lastMsgTime - times[options.limit - 1])
    if (times.length === options.limit) {
      if (now - lastMsgTime > options.delay) return (times[0] + options.duration) - now
      else return Math.max((times[0] + options.duration) - now, options.delay - (now - lastMsgTime)) + 1
    } else if (times.length > options.limit) {
      if (now - lastMsgTime > options.delay) return (times[0] + options.duration) - now + (lastMsgTime - times[options.limit - 1])
      else return Math.max((times[0] + options.duration) - now, options.delay - (now - lastMsgTime)) + (lastMsgTime - times[options.limit - 1])
    }
    return now - lastMsgTime > options.delay ? 0 : options.delay - (now - lastMsgTime)
  }
}
